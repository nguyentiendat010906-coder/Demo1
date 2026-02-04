import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { GroupService } from '../../services/group.service';
import { NotificationService } from '../../services/notification.service';
import { Product } from '../../models/product';
import { Group } from '../../models/group';
import { ProductModalComponent } from '../../shared/product-modal/product-modal.component';
import { GroupModalComponent } from "../../shared/group-modal/group-modal.component";

interface VisibleColumns {
  image: boolean;
  group: boolean;
  category: boolean;
  code: boolean;
  name: boolean;
  price: boolean;
  unit: boolean;
  unitType: boolean;
  stock: boolean;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductModalComponent, GroupModalComponent],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  selectedProduct: Product | null = null;
  groups: Group[] = [];
  
  filterProduct = {
    groupId: null as number | null
  };
  
  showProductModal: boolean = false;
  showGroupModal: boolean = false;
  editingGroup: Group | null = null;
  editingProduct: Product | null = null;
  groupReloadTrigger: number = 0;
  
  Math = Math;
  
  selectedYear: string = '2026';
  searchType: string = 'name';
  searchKeyword: string = '';
  
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  
  showColumnPanel = false;
  visibleColumns: VisibleColumns = this.loadVisibleColumns();

  showGroupDropdown = false;

  constructor(
    private productService: ProductService,
    private groupService: GroupService,
    private notification: NotificationService
  ) {}

  ngOnInit() {
    this.loadGroups();
    this.loadProducts();
  }
  
  openModal() {
    this.editingProduct = null;
    this.showProductModal = true;
  }

  loadGroups() {
    this.groupService.getAllGroups('product').subscribe({
      next: (data: Group[]) => {
        this.groups = data;
        console.log('✅ Đã tải Groups:', data);
      },
      error: (err: any) => {
        console.error('❌ Lỗi tải nhóm:', err);
        this.notification.error('Không thể tải danh sách nhóm!');
      }
    });
  }

loadProducts(keepCurrentPage: boolean = false) {
  const savedPage = keepCurrentPage ? this.currentPage : 1;
  
  this.productService.getAllProducts().subscribe({
    next: (data: any[]) => {
      console.log('=== Raw data from API ===');
      console.log(data);
      
      this.products = data.map(item => ({
        id: item.id,
        groupID: item.groupID,
        group: item.group,
        code: item.code,
        name: item.name,
        price: item.price,
        stock: item.stock,
        category: item.category,
        unitType: item.unitType,
        unitTypeId: item.unitTypeId,
        groupName: item.groupName,
        imageUrl: item.imageUrl || item.image || null
      }));
      
      // ✅ Sắp xếp theo mã nhóm (group) tăng dần
      this.products.sort((a, b) => {
        const groupA = a.group || '';
        const groupB = b.group || '';
        return groupA.localeCompare(groupB, undefined, { numeric: true });
      });
      
      console.log('=== Mapped & Sorted products ===');
      console.log(this.products);
      
      this.filteredProducts = [...this.products];
      this.totalItems = this.products.length;
      
      this.currentPage = savedPage;
      
      if (this.currentPage > this.totalPages && this.totalPages > 0) {
        this.currentPage = this.totalPages;
      }
    },
    error: (err: any) => {
      console.error('❌ Lỗi tải dữ liệu:', err);
      this.notification.error('Không thể tải danh sách sản phẩm!');
    }
  });
}

  applyFilter() {
    let result = [...this.products];
    
    if (this.filterProduct.groupId != null) {
      const groupId = Number(this.filterProduct.groupId);
      result = result.filter(p => Number(p.groupID) === groupId);
    }
    
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase();
      result = result.filter(p => {
        switch(this.searchType) {
          case 'name':
            return p.name?.toLowerCase().includes(keyword);
          case 'code':
            return p.code?.toLowerCase().includes(keyword);
          default:
            return false;
        }
      });
    }
    
    this.filteredProducts = result;
    this.totalItems = result.length;
    this.currentPage = 1;
  }

  clearFilter() {
    this.filterProduct.groupId = null;
    this.searchType = 'name';
    this.searchKeyword = '';
    this.filteredProducts = [...this.products];
    this.totalItems = this.products.length;
    this.currentPage = 1;
  }

  get paginatedProducts(): Product[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredProducts.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  goToFirstPage() {
    this.currentPage = 1;
  }

  goToLastPage() {
    this.currentPage = this.totalPages;
  }

  changePageSize() {
    this.currentPage = 1;
  }

  get displayRange(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
    return `Từ ${start} đến ${end} trên tổng ${this.totalItems}`;
  }

  viewDetail(product: Product) {
    this.editingProduct = { ...product };
    this.showProductModal = true;
  }

  createNew() {
    this.editingProduct = null;
    this.showProductModal = true;
  }

  closeModal() {
    this.selectedProduct = null;
  }

handleSave(productData: any) {
  const isEditing = productData.id && productData.id > 0;

  if (isEditing) {
    const formData = new FormData();
    
    formData.append('name', productData.name || '');
    formData.append('price', productData.price?.toString() || '0');
    formData.append('stock', productData.initialStock?.toString() || '0');
    formData.append('category', productData.category || 'Khác');
    formData.append('unitType', productData.unit || '');
    formData.append('unitTypeId', '1');
    formData.append('groupID', productData.group?.toString() || '');

    // ✅ XỬ LÝ 3 TRƯỜNG HỢP
    if (productData.imageFile) {
      // Có file mới → gửi file
      formData.append('image', productData.imageFile);
    } else if (productData.shouldRemoveImage) {
      // User xóa ảnh → gửi flag để xóa
      formData.append('removeImage', 'true');
    } else {
      // Giữ nguyên ảnh cũ
      formData.append('imageUrl', productData.imageUrl || '');
    }

    this.productService.updateProductWithFile(productData.id, formData).subscribe({
      next: () => {
        this.notification.success('Đã cập nhật sản phẩm thành công!');
        this.loadProducts(true);
        this.showProductModal = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.notification.error('Có lỗi khi cập nhật sản phẩm!');
      }
    });

  } else {
    // CREATE logic giữ nguyên như cũ
    const formData = new FormData();
    formData.append('name', productData.name || '');
    formData.append('price', productData.price?.toString() || '0');
    formData.append('stock', productData.initialStock?.toString() || '0');
    formData.append('category', productData.category || 'Khác');
    formData.append('unitType', productData.unit || '');
    formData.append('unitTypeId', '1');
    formData.append('groupID', productData.group?.toString() || '');

    if (productData.imageFile) {
      formData.append('image', productData.imageFile);
    }

    this.productService.createProductWithFile(formData).subscribe({
      next: () => {
        this.notification.success('Đã tạo sản phẩm mới thành công!');
        this.loadProducts(true);
        this.showProductModal = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.notification.error('Có lỗi khi tạo sản phẩm!');
      }
    });
  }
}

// Hàm helper gọi API update
private callUpdate(id: number, payload: any) {
  this.productService.updateProduct(id, payload).subscribe({
    next: () => {
      this.notification.success('Đã cập nhật sản phẩm thành công!');
      this.loadProducts(true);
      this.showProductModal = false;
    },
    error: (err) => {
      console.error('Error:', err);
      this.notification.error('Có lỗi khi cập nhật sản phẩm!');
    }
  });
}

  async deleteProduct(product: Product) {
    const confirmed = await this.notification.confirm({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa sản phẩm "${product.name}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;
    
    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.notification.success('Đã xóa sản phẩm thành công!');
        this.loadProducts(true);
      },
      error: () => this.notification.error('Có lỗi xảy ra khi xóa sản phẩm!')
    });
  }


  getSelectedGroupText(): string {
    if (this.filterProduct.groupId == null) {
      return 'Tất cả';
    }
    const selected = this.groups.find(g => g.id === this.filterProduct.groupId);
    return selected ? `${selected.code} - ${selected.name}` : 'Tất cả';
  }

  selectGroup(groupId: number | null) {
    this.filterProduct.groupId = groupId;
    this.showGroupDropdown = false;
    this.applyFilter();
  }

  openGroupModal() {
    this.editingGroup = null;
    this.showGroupModal = true;
  }

  openEditGroupModal(group: Group, event: Event) {
    event.stopPropagation();
    this.editingGroup = { ...group };
    this.showGroupModal = true;
    this.showGroupDropdown = false;
  }

  handleCloseModal() {
    this.showGroupModal = false;
    this.editingGroup = null;
  }

  async handleSubmit(data: Group) {
    if (this.editingGroup) {
      const confirmed = await this.notification.confirm({
        title: 'Xác nhận cập nhật nhóm',
        message: `Bạn có chắc muốn cập nhật nhóm "${this.editingGroup.name}"?`,
        confirmText: 'Cập nhật',
        cancelText: 'Hủy'
      });

      if (!confirmed) return;

      this.groupService.updateGroup(this.editingGroup.id, data).subscribe({
        next: () => {
          this.notification.success('Đã cập nhật nhóm thành công!');
          this.loadGroups();
          this.groupReloadTrigger++;
          this.handleCloseModal();
        },
        error: (err: any) => {
          console.error('Lỗi cập nhật:', err);
          let errorMessage = 'Có lỗi khi cập nhật nhóm';
          if (err.error?.Message || err.error?.message) {
            errorMessage = err.error.Message || err.error.message;
          }
          this.notification.error(errorMessage);
        }
      });
    } else {
      const confirmed = await this.notification.confirm({
        title: 'Xác nhận tạo nhóm',
        message: `Bạn có chắc muốn tạo nhóm "${data.name}"?`,
        confirmText: 'Tạo mới',
        cancelText: 'Hủy'
      });

      if (!confirmed) return;

      this.groupService.createGroup(data).subscribe({
        next: () => {
          this.notification.success('Đã tạo nhóm mới thành công!');
          this.loadGroups();
          this.groupReloadTrigger++;
          this.handleCloseModal();
        },
        error: (err: any) => {
          console.error('Lỗi tạo nhóm:', err);
          let errorMessage = 'Có lỗi khi tạo nhóm';
          if (err.error?.Message || err.error?.message) {
            errorMessage = err.error.Message || err.error.message;
          }
          this.notification.error(errorMessage);
        }
      });
    }
  }

  async handleDeleteGroup(group: Group) {
    const confirmed = await this.notification.confirm({
      title: 'Xác nhận xóa nhóm',
      message: `Bạn có chắc muốn xóa nhóm "${group.name}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    this.groupService.deleteGroup(group.id).subscribe({
      next: () => {
        this.notification.success('Đã xóa nhóm thành công!');
        this.loadGroups();
        this.groupReloadTrigger++;
        this.handleCloseModal();

    if (this.filterProduct.groupId === group.id) {
      this.filterProduct.groupId = null;
      this.applyFilter();
    }
  },
  error: (err: any) => {
    let errorMessage = 'Có lỗi khi xóa nhóm';
    if (err.error?.Message || err.error?.message) {
      errorMessage = err.error.Message || err.error.message;
    }
    this.notification.error(errorMessage);
  }
});
}
private closeAllDropdowns(): void {
  this.showGroupDropdown = false;
  this.showSearchTypeDropdown = false;
  this.showColumnPanel = false;
}
toggleGroupDropdown() {
  this.closeAllDropdowns();
  this.showGroupDropdown = !this.showGroupDropdown;
}

toggleColumnPanel(event: MouseEvent) {
  event.stopPropagation();
  this.closeAllDropdowns();
  this.showColumnPanel = !this.showColumnPanel;
}

toggleSearchTypeDropdown() {
  this.closeAllDropdowns();
  this.showSearchTypeDropdown = !this.showSearchTypeDropdown;
}

@HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  
  const isInsideGroup = target.closest('.custom-group-select');
  const isInsideColumn = target.closest('.column-toggle-wrapper');
  
  if (!isInsideGroup && !isInsideColumn) {
    this.closeAllDropdowns();
  }
}
showSearchTypeDropdown = false;


selectSearchType(type: string) {
  this.searchType = type;
  this.showSearchTypeDropdown = false;
}

getSearchTypeText(): string {
  return this.searchType === 'name' ? 'Tên sản phẩm' : 'Mã sản phẩm';
}
handleImageError(event: any) {
  event.target.src = 'assets/images/no-image.png';
}
// Load visible columns from localStorage
private loadVisibleColumns(): VisibleColumns {
  const saved = localStorage.getItem('product_visible_columns');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading visible columns:', e);
    }
  }
  
  // Default values nếu chưa có trong localStorage
  return {
    image: true,
    group: true,
    category: true,
    code: true,
    name: true,
    price: true,
    unit: true,
    unitType: true,
    stock: true
  };
}

// Save visible columns to localStorage
saveVisibleColumns(): void {
  localStorage.setItem('product_visible_columns', JSON.stringify(this.visibleColumns));
}
}