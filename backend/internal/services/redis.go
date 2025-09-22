package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisService struct {
	client *redis.Client
}

func NewRedisService(addr, password string, db int) *RedisService {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	return &RedisService{
		client: rdb,
	}
}

func (r *RedisService) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	return r.client.Set(ctx, key, data, expiration).Err()
}

func (r *RedisService) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := r.client.Get(ctx, key).Result()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(data), dest)
}

func (r *RedisService) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, key).Err()
}

func (r *RedisService) DeletePattern(ctx context.Context, pattern string) error {
	keys, err := r.client.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) == 0 {
		return nil
	}

	return r.client.Del(ctx, keys...).Err()
}

func (r *RedisService) Exists(ctx context.Context, key string) (bool, error) {
	count, err := r.client.Exists(ctx, key).Result()
	return count > 0, err
}

func (r *RedisService) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

func (r *RedisService) Close() error {
	return r.client.Close()
}

type ProductListCache struct {
	Products interface{} `json:"products"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	Limit    int         `json:"limit"`
}

func (r *RedisService) GenerateProductListCacheKey(page int, limit int, search string, categoryID string) string {
	return fmt.Sprintf("products:list:page:%d:limit:%d:search:%s:category:%s", page, limit, search, categoryID)
}