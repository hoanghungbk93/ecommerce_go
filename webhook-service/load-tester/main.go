package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"
)

type LoadTester struct {
	client       *http.Client
	baseURL      string
	concurrent   int
	duration     time.Duration
	rampUp       time.Duration
	requests     int64
	successes    int64
	failures     int64
	totalLatency int64
	minLatency   int64
	maxLatency   int64
	mu           sync.RWMutex
	latencies    []int64
}

type WebhookPayload struct {
	Event     string  `json:"event"`
	OrderID   string  `json:"order_id"`
	Amount    float64 `json:"amount"`
	Timestamp int64   `json:"timestamp"`
	UserID    string  `json:"user_id"`
	Metadata  map[string]interface{} `json:"metadata"`
}

type TestResult struct {
	TotalRequests    int64         `json:"total_requests"`
	Successes        int64         `json:"successes"`
	Failures         int64         `json:"failures"`
	SuccessRate      float64       `json:"success_rate"`
	AvgLatency       time.Duration `json:"avg_latency_ms"`
	MinLatency       time.Duration `json:"min_latency_ms"`
	MaxLatency       time.Duration `json:"max_latency_ms"`
	RequestsPerSec   float64       `json:"requests_per_sec"`
	P50Latency       time.Duration `json:"p50_latency_ms"`
	P95Latency       time.Duration `json:"p95_latency_ms"`
	P99Latency       time.Duration `json:"p99_latency_ms"`
	TestDuration     time.Duration `json:"test_duration"`
}

func NewLoadTester(baseURL string, concurrent int, duration, rampUp time.Duration) *LoadTester {
	tr := &http.Transport{
		MaxIdleConns:        concurrent * 2,
		MaxIdleConnsPerHost: concurrent,
		IdleConnTimeout:     30 * time.Second,
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		DisableCompression:  true,
	}

	client := &http.Client{
		Transport: tr,
		Timeout:   30 * time.Second,
	}

	return &LoadTester{
		client:     client,
		baseURL:    baseURL,
		concurrent: concurrent,
		duration:   duration,
		rampUp:     rampUp,
		minLatency: int64(time.Hour), // Initialize with high value
		latencies:  make([]int64, 0),
	}
}

func (lt *LoadTester) generatePayload() WebhookPayload {
	events := []string{
		"payment.completed",
		"payment.failed", 
		"order.created",
		"order.updated",
		"user.registered",
		"subscription.renewed",
	}

	return WebhookPayload{
		Event:     events[rand.Intn(len(events))],
		OrderID:   fmt.Sprintf("order_%d", rand.Int63n(1000000)),
		Amount:    float64(rand.Intn(10000)) / 100, // $0.00 - $100.00
		Timestamp: time.Now().Unix(),
		UserID:    fmt.Sprintf("user_%d", rand.Int63n(100000)),
		Metadata: map[string]interface{}{
			"source":      "load_test",
			"region":      []string{"us-east-1", "us-west-2", "eu-west-1"}[rand.Intn(3)],
			"customer_id": rand.Int63n(50000),
		},
	}
}

func (lt *LoadTester) sendRequest(ctx context.Context) error {
	payload := lt.generatePayload()
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	start := time.Now()
	
	req, err := http.NewRequestWithContext(ctx, "POST", lt.baseURL+"/health", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "LoadTester/1.0")
	
	resp, err := lt.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	latency := time.Since(start)
	latencyNs := latency.Nanoseconds()
	
	// Read and discard body to reuse connection
	io.Copy(io.Discard, resp.Body)
	
	// Update statistics
	atomic.AddInt64(&lt.requests, 1)
	atomic.AddInt64(&lt.totalLatency, latencyNs)
	
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		atomic.AddInt64(&lt.successes, 1)
	} else {
		atomic.AddInt64(&lt.failures, 1)
	}
	
	// Update min/max latency
	for {
		current := atomic.LoadInt64(&lt.minLatency)
		if latencyNs >= current {
			break
		}
		if atomic.CompareAndSwapInt64(&lt.minLatency, current, latencyNs) {
			break
		}
	}
	
	for {
		current := atomic.LoadInt64(&lt.maxLatency)
		if latencyNs <= current {
			break
		}
		if atomic.CompareAndSwapInt64(&lt.maxLatency, current, latencyNs) {
			break
		}
	}
	
	// Store latency for percentile calculation
	lt.mu.Lock()
	lt.latencies = append(lt.latencies, latencyNs)
	lt.mu.Unlock()
	
	return nil
}

func (lt *LoadTester) worker(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	
	for {
		select {
		case <-ctx.Done():
			return
		default:
			if err := lt.sendRequest(ctx); err != nil {
				atomic.AddInt64(&lt.failures, 1)
			}
			// Small delay between requests per worker
			time.Sleep(time.Millisecond * time.Duration(rand.Intn(100)))
		}
	}
}

func (lt *LoadTester) Run() TestResult {
	log.Printf("Starting load test: %d concurrent users for %v", lt.concurrent, lt.duration)
	
	ctx, cancel := context.WithTimeout(context.Background(), lt.duration)
	defer cancel()
	
	var wg sync.WaitGroup
	startTime := time.Now()
	
	// Ramp up workers gradually
	rampUpDelay := lt.rampUp / time.Duration(lt.concurrent)
	
	for i := 0; i < lt.concurrent; i++ {
		wg.Add(1)
		go lt.worker(ctx, &wg)
		
		if lt.rampUp > 0 {
			time.Sleep(rampUpDelay)
		}
	}
	
	// Progress reporting
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				requests := atomic.LoadInt64(&lt.requests)
				successes := atomic.LoadInt64(&lt.successes)
				failures := atomic.LoadInt64(&lt.failures)
				
				elapsed := time.Since(startTime)
				rps := float64(requests) / elapsed.Seconds()
				
				log.Printf("Progress: %d requests, %d success, %d failures, %.1f req/s",
					requests, successes, failures, rps)
			}
		}
	}()
	
	wg.Wait()
	testDuration := time.Since(startTime)
	
	return lt.calculateResults(testDuration)
}

func (lt *LoadTester) calculateResults(testDuration time.Duration) TestResult {
	requests := atomic.LoadInt64(&lt.requests)
	successes := atomic.LoadInt64(&lt.successes)
	failures := atomic.LoadInt64(&lt.failures)
	totalLatency := atomic.LoadInt64(&lt.totalLatency)
	minLatency := atomic.LoadInt64(&lt.minLatency)
	maxLatency := atomic.LoadInt64(&lt.maxLatency)
	
	var successRate float64
	if requests > 0 {
		successRate = float64(successes) / float64(requests) * 100
	}
	
	var avgLatency time.Duration
	if requests > 0 {
		avgLatency = time.Duration(totalLatency / requests)
	}
	
	rps := float64(requests) / testDuration.Seconds()
	
	// Calculate percentiles
	lt.mu.RLock()
	latencies := make([]int64, len(lt.latencies))
	copy(latencies, lt.latencies)
	lt.mu.RUnlock()
	
	p50, p95, p99 := calculatePercentiles(latencies)
	
	return TestResult{
		TotalRequests:  requests,
		Successes:      successes,
		Failures:       failures,
		SuccessRate:    successRate,
		AvgLatency:     avgLatency,
		MinLatency:     time.Duration(minLatency),
		MaxLatency:     time.Duration(maxLatency),
		RequestsPerSec: rps,
		P50Latency:     time.Duration(p50),
		P95Latency:     time.Duration(p95),
		P99Latency:     time.Duration(p99),
		TestDuration:   testDuration,
	}
}

func calculatePercentiles(latencies []int64) (p50, p95, p99 int64) {
	if len(latencies) == 0 {
		return 0, 0, 0
	}
	
	// Simple percentile calculation (not sorting for performance)
	n := len(latencies)
	if n == 1 {
		return latencies[0], latencies[0], latencies[0]
	}
	
	// For large datasets, sample subset for percentile calculation
	sampleSize := n
	if n > 10000 {
		sampleSize = 10000
	}
	
	sample := make([]int64, sampleSize)
	for i := 0; i < sampleSize; i++ {
		sample[i] = latencies[i*n/sampleSize]
	}
	
	// Simple bubble sort for percentiles (good enough for sample)
	for i := 0; i < len(sample); i++ {
		for j := i + 1; j < len(sample); j++ {
			if sample[i] > sample[j] {
				sample[i], sample[j] = sample[j], sample[i]
			}
		}
	}
	
	p50 = sample[sampleSize*50/100]
	p95 = sample[sampleSize*95/100]
	p99 = sample[sampleSize*99/100]
	
	return p50, p95, p99
}

func main() {
	var (
		baseURL    = flag.String("url", "http://localhost", "Base URL for load testing")
		concurrent = flag.Int("c", 1000, "Number of concurrent users")
		duration   = flag.Duration("d", 60*time.Second, "Test duration")
		rampUp     = flag.Duration("r", 10*time.Second, "Ramp up duration")
		output     = flag.String("o", "", "Output file for results (JSON)")
	)
	flag.Parse()
	
	log.Printf("Load Test Configuration:")
	log.Printf("- Target URL: %s", *baseURL)
	log.Printf("- Concurrent Users: %d", *concurrent)
	log.Printf("- Test Duration: %v", *duration)
	log.Printf("- Ramp Up Duration: %v", *rampUp)
	log.Printf("")
	
	tester := NewLoadTester(*baseURL, *concurrent, *duration, *rampUp)
	result := tester.Run()
	
	// Print results
	fmt.Printf("\n=== LOAD TEST RESULTS ===\n")
	fmt.Printf("Test Duration: %v\n", result.TestDuration)
	fmt.Printf("Total Requests: %d\n", result.TotalRequests)
	fmt.Printf("Successful Requests: %d\n", result.Successes)
	fmt.Printf("Failed Requests: %d\n", result.Failures)
	fmt.Printf("Success Rate: %.2f%%\n", result.SuccessRate)
	fmt.Printf("Requests/sec: %.2f\n", result.RequestsPerSec)
	fmt.Printf("\nLatency Statistics:\n")
	fmt.Printf("  Average: %v\n", result.AvgLatency)
	fmt.Printf("  Minimum: %v\n", result.MinLatency)
	fmt.Printf("  Maximum: %v\n", result.MaxLatency)
	fmt.Printf("  50th percentile: %v\n", result.P50Latency)
	fmt.Printf("  95th percentile: %v\n", result.P95Latency)
	fmt.Printf("  99th percentile: %v\n", result.P99Latency)
	
	// Save to file if specified
	if *output != "" {
		if data, err := json.MarshalIndent(result, "", "  "); err == nil {
			if err := writeToFile(*output, data); err != nil {
				log.Printf("Failed to write results to %s: %v", *output, err)
			} else {
				log.Printf("Results saved to %s", *output)
			}
		}
	}
}

func writeToFile(filename string, data []byte) error {
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()
	
	_, err = file.Write(data)
	return err
}
