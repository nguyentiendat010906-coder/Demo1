// src/app/pages/products/products.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product, Category } from '../../models/product'; // Import từ models/product

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];

  visibleColumns = {
    category: true,
    code: true,
    name: true,
    price: true,
    unit: true,
    stock: true
  };

  selectedYear: string = '2026';
  selectedCategoryId: number | null = null;
  searchType: string = 'name';
  searchKeyword: string = '';
  showCategoryDropdown: boolean = false;

  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  pageNumbers: number[] = [];

  showColumnPanel: boolean = false;
  selectedProduct: Product | null = null;
  showModal: boolean = false;
  editingCategory: Category | null = null;

  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];

  Math = Math;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe({
      next: (data: Product[]) => {
        this.products = data;
        this.applyFilter();
      },
      error: (err: any) => console.error('Error loading products:', err)
    });
  }

  loadCategories(): void {
    this.categories = [
      { id: 1, code: 'DM01', name: 'Đồ uống' },
      { id: 2, code: 'DM02', name: 'Thức ăn' },
      { id: 3, code: 'DM03', name: 'Tráng miệng' }
    ];
  }

  toggleColumnPanel(event: Event): void {
    event.stopPropagation();
    this.showColumnPanel = !this.showColumnPanel;
  }

  @HostListener('document:click')
  closeColumnPanel(): void {
    this.showColumnPanel = false;
  }

  toggleCategoryDropdown(): void {
    this.showCategoryDropdown = !this.showCategoryDropdown;
  }

  selectCategory(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.showCategoryDropdown = false;
    this.applyFilter();
  }

  getSelectedCategoryText(): string {
    if (!this.selectedCategoryId) {
      return 'Tất cả';
    }
    const category = this.categories.find(c => c.id === this.selectedCategoryId);
    return category ? `${category.code} - ${category.name}` : 'Tất cả';
  }

  openCategoryModal(): void {
    this.editingCategory = null;
    this.showModal = true;
  }

  openEditCategoryModal(category: Category, event: Event): void {
    event.stopPropagation();
    this.editingCategory = { ...category };
    this.showModal = true;
  }

  handleCloseModal(): void {
    this.showModal = false;
    this.editingCategory = null;
  }

  handleSubmit(category: Category): void {
    if (category.id) {
      const index = this.categories.findIndex(c => c.id === category.id);
      if (index !== -1) {
        this.categories[index] = category;
      }
    } else {
      const newId = Math.max(...this.categories.map(c => c.id), 0) + 1;
      this.categories.push({ ...category, id: newId });
    }
    this.handleCloseModal();
  }

  handleDeleteCategory(categoryId: number): void {
    this.categories = this.categories.filter(c => c.id !== categoryId);
    this.handleCloseModal();
  }

  applyFilter(): void {
    this.filteredProducts = this.products.filter(product => {
      if (this.selectedCategoryId) {
        const category = this.categories.find(c => c.id === this.selectedCategoryId);
        if (category && !product.category.includes(category.code)) {
          return false;
        }
      }

      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.toLowerCase().trim();
        switch (this.searchType) {
          case 'name':
            return product.name.toLowerCase().includes(keyword);
          case 'code':
            return product.code.toLowerCase().includes(keyword);
          case 'category':
            return product.category.toLowerCase().includes(keyword);
          default:
            return true;
        }
      }

      return true;
    });

    this.totalItems = this.filteredProducts.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilter(): void {
    this.selectedCategoryId = null;
    this.searchKeyword = '';
    this.searchType = 'name';
    this.applyFilter();
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedProducts = this.filteredProducts.slice(start, end);

    this.pageNumbers = [];
    const maxPages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      this.pageNumbers.push(i);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages);
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.updatePagination();
  }

  createNew(): void {
    this.selectedProduct = {
      id: 0,
      category: '',
      code: '',
      name: '',
      price: 0,
      unit: '',
      stock: 0
    };
  }

  viewDetail(product: Product): void {
    this.selectedProduct = { ...product };
  }

  deleteProduct(product: Product): void {
    if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`)) {
      this.productService.deleteProduct(product.id).subscribe({
        next: () => {
          this.loadProducts();
          alert('Xóa sản phẩm thành công!');
        },
        error: (err: any) => {
          console.error('Error deleting product:', err);
          alert('Có lỗi xảy ra khi xóa sản phẩm!');
        }
      });
    }
  }

  saveProduct(product: Product): void {
    if (product.id === 0) {
      this.productService.createProduct(product).subscribe({
        next: () => {
          this.loadProducts();
          this.closeModal();
          alert('Tạo mới sản phẩm thành công!');
        },
        error: (err: any) => {
          console.error('Error creating product:', err);
          alert('Có lỗi xảy ra khi tạo sản phẩm!');
        }
      });
    } else {
      this.productService.updateProduct(product.id, product).subscribe({
        next: () => {
          this.loadProducts();
          this.closeModal();
          alert('Cập nhật sản phẩm thành công!');
        },
        error: (err: any) => {
          console.error('Error updating product:', err);
          alert('Có lỗi xảy ra khi cập nhật sản phẩm!');
        }
      });
    }
  }

  closeModal(): void {
    this.selectedProduct = null;
  }

  openCategoryModalFromProduct(): void {
    this.openCategoryModal();
  }
}