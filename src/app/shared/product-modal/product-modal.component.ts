import { Component, EventEmitter, Input, Output, ViewChild, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { GroupService } from '../../services/group.service';
import { NotificationService } from '../../services/notification.service';
import { Group } from '../../models/group';
import { Product } from '../../models/product';
import { GroupModalComponent } from '../group-modal/group-modal.component';

interface ProductForm {
  id?: number;
  group: number | null;
  code: string;
  name: string;
  category: string; // ← CHỈ LƯU 1 GIÁ TRỊ
  unit: string;
  price: number;
  tax: string;
  initialStock: number;
  isService: boolean;
  hasConversion: boolean;
  note: string;
  imageUrl?: string | null;
  imageFile?: File | null;
  shouldRemoveImage?: boolean;
}

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, GroupModalComponent],
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.css']
})
export class ProductModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() reloadTrigger: number = 0;
  @Input() editingProduct: Product | null = null;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSave = new EventEmitter<ProductForm>();

  @ViewChild('productForm') productForm!: NgForm;

  formData: ProductForm = {
    group: null,
    code: '',
    name: '',
    category: '', // ← MẶC ĐỊNH TRỐNG
    unit: '',
    price: 0,
    tax: 'KCT',
    initialStock: 0,
    isService: false,
    hasConversion: false,
    note: '',
    imageUrl: ''
  };
  
  productGroups: Group[] = [];
  submitted: boolean = false;
  
  showGroupModal: boolean = false;
  editingGroup: any = null;
  
  unitOptions: string[] = [
    'Bát', 'Bộ', 'Cái', 'Chai', 'Chiếc', 'Cốc', 'Cuốn', 
    'Đĩa', 'Đôi', 'g', 'h', 'Kg', 'Lít', 'Ly', 'Một', 
    'Ngày', 'Nồi', 'Phần', 'Tạ', 'Tấn', 'Tháng', 'Thùng', 'Yến'
  ];
  
  categoryOptions: string[] = ['Bếp', 'Bar', 'Khác']; // ← DANH SÁCH CATEGORY
  
  errors: { [key: string]: string } = {};
  imageFile: File | null = null;
  imagePreview: string | null = null;
  shouldRemoveImage: boolean = false;

  taxOptions = ['KCT', '0%', '5%', '10%'];

  // ✅ THÊM: Biến điều khiển dropdown
  showModalGroupDropdown = false;
  showUnitDropdown = false;
  showTaxDropdown = false;
  showCategoryDropdown = false; // ← THÊM DROPDOWN CHO CATEGORY

  constructor(
    private groupService: GroupService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadProductGroups();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reloadTrigger'] && !changes['reloadTrigger'].firstChange) {
      this.loadProductGroups();
    }
    
    if (changes['editingProduct']) {
      if (this.editingProduct) {
        setTimeout(() => {
          this.loadProductData(this.editingProduct!);
        }, 100);
      } else if (changes['editingProduct'].previousValue) {
        this.resetForm();
      }
    }
    
    if (changes['isOpen'] && !this.isOpen) {
      this.resetForm();
    }
  }

  loadProductData(product: Product): void {
    console.log('=== Loading product data ===');
    console.log('Product:', product);
    console.log('GroupID:', product.groupID);
    
    // ✅ LẤY CATEGORY TRỰC TIẾP (không cần split)
    const categoryValue = (product as any).category || '';
    
    this.formData = {
      id: product.id,
      group: product.groupID || null,
      code: product.code || '',
      name: product.name || '',
      category: categoryValue, // ← LƯU TRỰC TIẾP "Bếp" hoặc "Bar" hoặc "Khác"
      unit: product.unitType || '',
      price: product.price || 0,
      tax: 'KCT',
      initialStock: product.stock || 0,
      isService: false,
      hasConversion: false,
      note: '',
      imageUrl: product.imageUrl || ''
    };
    
    if (product.imageUrl) {
      this.imagePreview = product.imageUrl;
    }
    
    console.log('=== FormData after load ===');
    console.log('formData:', this.formData);
  }

  loadProductGroups(): void {
    this.groupService.getAllGroups('product').subscribe({
      next: (data) => {
        this.productGroups = data.map(g => ({
          ...g,
          id: Number(g.id)
        }));
        
        console.log('=== Product Groups Loaded ===');
        console.log(this.productGroups);
      },
      error: (err) => {
        console.error('Lỗi tải danh sách nhóm sản phẩm:', err);
      }
    });
  }

  closeModal(): void {
    this.submitted = false;
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.resetForm();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.size <= 512 * 1024 * 1024) {
      this.imageFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
      
      console.log('File selected:', file.name, file.size);
    } else {
      alert('Kích thước file không được vượt quá 512MB');
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.productForm) {
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.controls[key].markAsTouched();
      });
    }

    // ✅ KIỂM TRA CATEGORY
    if (!this.formData.category) {
      this.notification.error('Vui lòng chọn danh mục');
      return;
    }

    if (this.productForm && this.productForm.valid) {
      const isEditing = this.editingProduct && this.editingProduct.id;
      const confirmed = await this.notification.confirm({
        title: isEditing ? 'Xác nhận cập nhật' : 'Xác nhận tạo mới',
        message: isEditing 
          ? `Bạn có chắc muốn cập nhật hàng hóa "${this.formData.name}"?`
          : `Bạn có chắc muốn tạo hàng hóa mới "${this.formData.name}"?`,
        confirmText: isEditing ? 'Cập nhật' : 'Tạo mới',
        cancelText: 'Hủy'
      });

      if (!confirmed) return;

      // ✅ GỬI DỮ LIỆU
      const dataToSave = {
        ...this.formData,
        id: this.editingProduct?.id || 0,
        imageFile: this.imageFile,
        imageUrl: this.shouldRemoveImage ? null : this.formData.imageUrl,
        shouldRemoveImage: this.shouldRemoveImage
      };
      
      console.log('=== Data to save ===');
      console.log('Category:', dataToSave.category);
      console.log('Has imageFile:', !!this.imageFile);
      console.log('imageFile:', this.imageFile);
      
      this.onSave.emit(dataToSave);
      this.closeModal();
    }
  }

  resetForm(): void {
    this.formData = {
      group: null,
      code: '',
      name: '',
      category: '', // ← RESET VỀ TRỐNG
      unit: '',
      price: 0,
      tax: 'KCT',
      initialStock: 0,
      isService: false,
      hasConversion: false,
      note: '',
      imageUrl: ''
    };
    this.errors = {};
    this.submitted = false;
    this.imageFile = null;
    this.imagePreview = null;
    this.shouldRemoveImage = false;
  }

  // ===== CATEGORY DROPDOWN =====
  selectCategory(category: string): void {
    this.formData.category = category;
    this.showCategoryDropdown = false;
  }

  getCategoryText(): string {
    return this.formData.category || 'Chọn danh mục';
  }

  // ===== GROUP FUNCTIONS =====
  addNewGroup(): void {
    this.editingGroup = null;
    this.showGroupModal = true;
  }

  getModalSelectedGroupText(): string {
    if (!this.formData.group) return 'Chọn nhóm';
    const g = this.productGroups.find(g => g.id === this.formData.group);
    return g ? `${g.code} - ${g.name}` : 'Chọn nhóm';
  }

  editModalGroup(group: any, event: Event): void {
    event.stopPropagation();
    this.showModalGroupDropdown = false;
    this.editingGroup = group;
    this.showGroupModal = true;
  }

  handleCloseGroupModal(): void {
    this.showGroupModal = false;
    this.editingGroup = null;
  }

  async handleSubmitGroup(data: any): Promise<void> {
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
          this.loadProductGroups();
          this.handleCloseGroupModal();
        },
        error: (err) => {
          this.notification.error('Có lỗi khi cập nhật nhóm');
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

      const groupData = { ...data, type: 'product' };
      this.groupService.createGroup(groupData).subscribe({
        next: () => {
          this.notification.success('Đã tạo nhóm mới thành công!');
          this.loadProductGroups();
          this.handleCloseGroupModal();
        },
        error: (err) => {
          this.notification.error('Có lỗi khi tạo nhóm');
        }
      });
    }
  }

  async handleDeleteGroup(group: any): Promise<void> {
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
        this.loadProductGroups();
        this.handleCloseGroupModal();
      },
      error: (err) => {
        this.notification.error('Có lỗi khi xóa nhóm');
      }
    });
  }

  // ===== IMAGE FUNCTIONS =====
  removeImage(): void {
    this.imagePreview = null;
    this.imageFile = null;
    this.formData.imageUrl = '';
    this.shouldRemoveImage = true;
  }

  getImageUrl(imagePath: string | null | undefined): string {
    if (!imagePath) {
      return 'assets/images/no-image.png';
    }
    
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    return `https://localhost:44385/${imagePath}`;
  }

  handleImageError(event: any) {
    event.target.src = 'assets/images/no-image.png';
  }
  // ===== DROPDOWN MANAGEMENT =====
  onModalBodyClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  
  // Nếu click KHÔNG phải vào dropdown thì đóng tất cả
  if (!target.closest('.custom-group-select')) {
    this.closeAllDropdowns();
  }
}
private closeAllDropdowns(): void {
  this.showModalGroupDropdown = false;
  this.showUnitDropdown = false;
  this.showTaxDropdown = false;
  this.showCategoryDropdown = false;
}

toggleModalGroupDropdown(): void {
  const currentState = this.showModalGroupDropdown;
  this.closeAllDropdowns();
  this.showModalGroupDropdown = !currentState;
}

toggleUnitDropdown(): void {
  const currentState = this.showUnitDropdown;
  this.closeAllDropdowns();
  this.showUnitDropdown = !currentState;
}

toggleTaxDropdown(): void {
  const currentState = this.showTaxDropdown;
  this.closeAllDropdowns();
  this.showTaxDropdown = !currentState;
}

toggleCategoryDropdown(): void {
  const currentState = this.showCategoryDropdown;
  this.closeAllDropdowns();
  this.showCategoryDropdown = !currentState;
}

// Cập nhật các method select để đóng dropdown
selectModalGroup(groupId: number | null): void {
  this.formData.group = groupId;
  this.showModalGroupDropdown = false;
}

selectUnit(unit: string): void {
  this.formData.unit = unit;
  this.showUnitDropdown = false;
}

selectTax(tax: string): void {
  this.formData.tax = tax;
  this.showTaxDropdown = false;
}


}