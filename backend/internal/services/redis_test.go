package services

import (
	"testing"
)

func TestRedisService_CacheKeyGeneration(t *testing.T) {
	redis := &RedisService{}

	tests := []struct {
		name       string
		page       int
		limit      int
		search     string
		categoryID string
		expected   string
	}{
		{
			name:       "Basic pagination",
			page:       1,
			limit:      20,
			search:     "",
			categoryID: "",
			expected:   "products:list:page:1:limit:20:search::category:",
		},
		{
			name:       "With search",
			page:       2,
			limit:      20,
			search:     "laptop",
			categoryID: "",
			expected:   "products:list:page:2:limit:20:search:laptop:category:",
		},
		{
			name:       "With category",
			page:       1,
			limit:      20,
			search:     "",
			categoryID: "5",
			expected:   "products:list:page:1:limit:20:search::category:5",
		},
		{
			name:       "With both search and category",
			page:       3,
			limit:      20,
			search:     "gaming",
			categoryID: "10",
			expected:   "products:list:page:3:limit:20:search:gaming:category:10",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := redis.GenerateProductListCacheKey(tt.page, tt.limit, tt.search, tt.categoryID)
			if got != tt.expected {
				t.Errorf("GenerateProductListCacheKey() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestProductListCache_Structure(t *testing.T) {
	cache := ProductListCache{
		Products: []interface{}{
			map[string]interface{}{
				"id":   1,
				"name": "Test Product",
			},
		},
		Total: 100,
		Page:  1,
		Limit: 20,
	}

	if cache.Total != 100 {
		t.Errorf("Expected Total to be 100, got %d", cache.Total)
	}

	if cache.Page != 1 {
		t.Errorf("Expected Page to be 1, got %d", cache.Page)
	}

	if cache.Limit != 20 {
		t.Errorf("Expected Limit to be 20, got %d", cache.Limit)
	}

	if len(cache.Products.([]interface{})) != 1 {
		t.Errorf("Expected 1 product, got %d", len(cache.Products.([]interface{})))
	}
}