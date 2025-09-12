import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createProduct, updateProduct } from '../../store/slices/productsSlice';
import { fetchCategories } from '../../store/slices/categoriesSlice';
import { Product } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, onSuccess }) => {
  const dispatch = useAppDispatch();
  const { categories } = useAppSelector((state) => state.categories);
  const { loading, error: reduxError } = useAppSelector((state) => state.products);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    short_description: '',
    price: 0,
    sale_price: 0,
    sku: '',
    stock: 0,
    min_stock: 5,
    weight: 0,
    dimensions: '',
    image_url: '',
    category_id: 0,
    brand: '',
    tags: '',
    is_featured: false,
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCategories());
      if (product) {
        setFormData({
          name: product.name,
          slug: product.slug,
          description: product.description || '',
          short_description: product.short_description || '',
          price: product.price,
          sale_price: product.sale_price || 0,
          sku: product.sku || '',
          stock: product.stock,
          min_stock: product.min_stock || 5,
          weight: product.weight || 0,
          dimensions: product.dimensions || '',
          image_url: product.image_url,
          category_id: product.category_id || 0,
          brand: product.brand || '',
          tags: product.tags || '',
          is_featured: product.is_featured,
          is_active: product.is_active,
        });
      } else {
        setFormData({
          name: '',
          slug: '',
          description: '',
          short_description: '',
          price: 0,
          sale_price: 0,
          sku: '',
          stock: 0,
          min_stock: 5,
          weight: 0,
          dimensions: '',
          image_url: '',
          category_id: 0,
          brand: '',
          tags: '',
          is_featured: false,
          is_active: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, product, dispatch]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.slug.trim()) newErrors.slug = 'Product slug is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (formData.stock < 0) newErrors.stock = 'Stock cannot be negative';
    if (!formData.image_url.trim()) newErrors.image_url = 'Image URL is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const productData = {
        ...formData,
        category_id: formData.category_id || undefined,
        sale_price: formData.sale_price || undefined,
        min_stock: formData.min_stock || undefined,
        weight: formData.weight || undefined,
        dimensions: formData.dimensions || undefined,
        brand: formData.brand || undefined,
        tags: formData.tags || undefined,
      };

      console.log('Submitting product data:', productData);

      let result;
      if (product) {
        console.log('Updating product with ID:', product.id);
        result = await dispatch(updateProduct({ id: product.id, data: productData }));
      } else {
        console.log('Creating new product');
        result = await dispatch(createProduct(productData as any));
      }
      
      console.log('Redux action result:', result);
      
      if (updateProduct.fulfilled.match(result) || createProduct.fulfilled.match(result)) {
        console.log('Product operation successful');
        onSuccess();
        onClose();
      } else {
        console.error('Product operation failed:', result);
        alert('Failed to save product. Please try again.');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('An error occurred while saving the product.');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: !product ? generateSlug(value) : prev.slug, // Only auto-generate slug for new products
    }));
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0
          }}>
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            {/* Product Name */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.name ? '2px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.slug ? '2px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
                placeholder="product-slug"
              />
              {errors.slug && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.slug}
                </p>
              )}
            </div>

            {/* Price */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.price ? '2px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
              {errors.price && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.price}
                </p>
              )}
            </div>

            {/* Sale Price */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Sale Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.sale_price}
                onChange={(e) => setFormData(prev => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* SKU */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
                placeholder="Product SKU"
              />
            </div>

            {/* Stock */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Stock *
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.stock ? '2px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
              {errors.stock && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {errors.stock}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: parseInt(e.target.value) || 0 }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value={0}>Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
                placeholder="Product brand"
              />
            </div>
          </div>

          {/* Image URL */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Image URL *
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: errors.image_url ? '2px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
              placeholder="https://example.com/image.jpg"
            />
            {errors.image_url && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.image_url}
              </p>
            )}
          </div>

          {/* Short Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Short Description
            </label>
            <textarea
              value={formData.short_description}
              onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
              rows={2}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
              placeholder="Brief product description"
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
              placeholder="Detailed product description"
            />
          </div>

          {/* Checkboxes */}
          <div style={{
            display: 'flex',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                style={{
                  width: '1rem',
                  height: '1rem'
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Featured Product</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                style={{
                  width: '1rem',
                  height: '1rem'
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Active</span>
            </label>
          </div>

          {/* Show Redux Error */}
          {reduxError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              marginBottom: '1rem'
            }}>
              Error: {reduxError}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
