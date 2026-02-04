import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { GroupService } from '../../services/group.service';
import { NotificationService } from '../../services/notification.service';
import { CustomerModalComponent } from '../../shared/customer-modal/customer-modal.component';
import { GroupModalComponent } from '../../shared/group-modal/group-modal.component';
import { Customer } from '../../models/customer';
import { Group } from '../../models/group';

interface VisibleColumns {
  group: boolean;
  code: boolean;
  name: boolean;
  taxCode: boolean;
  cccd: boolean;
  phone: boolean;
  address: boolean;
  email: boolean;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerModalComponent, GroupModalComponent],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  @ViewChild(CustomerModalComponent) customerModalRef!: CustomerModalComponent;

  // Dữ liệu
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  editingCustomer: Customer | null = null; // ← ĐỔI TÊN từ selectedCustomer
  groups: Group[] = [];
  
  // Filter customer
  filterCustomer = {
    groupID: null as number | null
  };
  
  // Modal states
  showModal: boolean = false;
  showCustomerModal: boolean = false; // ← THÊM biến này
  editingGroup: any = null;
  
  // Math for template
  Math = Math;
  
  // Filters
  selectedYear: string = '2026';
  searchType: string = 'name';
  searchKeyword: string = '';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  
  // Column visibility
  showColumnPanel = false;
  visibleColumns: VisibleColumns = this.loadVisibleColumns();

  // Custom dropdown
  showGroupDropdown = false;

  constructor(
    private customerService: CustomerService,
    private groupService: GroupService,
    private notification: NotificationService
  ) {}

  ngOnInit() {
    this.loadCustomers();
    this.loadGroups();
  }

  loadCustomers() {
  this.customerService.getAllCustomers().subscribe({
    next: (data) => {
      this.customers = data;
      
      // ✅ Sắp xếp theo mã nhóm (group) tăng dần
      this.customers.sort((a, b) => {
        const groupA = a.group || '';
        const groupB = b.group || '';
        return groupA.localeCompare(groupB, undefined, { numeric: true });
      });
      
      this.filteredCustomers = [...this.customers];
      this.totalItems = data.length;
    },
    
    error: (err) => {
      console.error('Lỗi tải dữ liệu:', err);
      this.notification.error('Không thể tải danh sách khách hàng!');
    }
  });
}

  loadGroups() {
    this.groupService.getAllGroups('customer').subscribe({
      next: (data) => {
        this.groups = data;
      },
      error: (err) => {
        console.error('Lỗi tải nhóm:', err);
        this.notification.error('Không thể tải danh sách nhóm!');
      }
    });
  }

  // Filter functions
  applyFilter() {
    let result = [...this.customers];
    
    if (this.filterCustomer.groupID != null) {
      const groupId = Number(this.filterCustomer.groupID);
      result = result.filter(c => Number(c.groupID) === groupId);
    }
    
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase();
      result = result.filter(c => {
        switch(this.searchType) {
          case 'name':
            return c.name?.toLowerCase().includes(keyword);
          case 'taxCode':
            return c.taxCode?.toLowerCase().includes(keyword);
          case 'address':
            return c.address?.toLowerCase().includes(keyword);
          case 'phone':
            return c.phone?.includes(keyword);
          case 'cccd':
            return c.cccd?.includes(keyword);
          default:
            return false;
        }
      });
    }
    
    this.filteredCustomers = result;
    this.totalItems = result.length;
    this.currentPage = 1;
  }

  clearFilter() {
    this.filterCustomer.groupID = null;
    this.searchType = 'name';
    this.searchKeyword = '';
    this.filteredCustomers = [...this.customers];
    this.totalItems = this.customers.length;
    this.currentPage = 1;
  }

  // Pagination
  get paginatedCustomers(): Customer[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredCustomers.slice(start, end);
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

  // CUSTOMER CRUD
  viewDetail(customer: Customer) {
    this.editingCustomer = { ...customer };
    this.showCustomerModal = true;
  }

  createNew() {
    this.editingCustomer = null; // null để tạo mới
    this.showCustomerModal = true;
  }

  closeModal() {
    this.editingCustomer = null;
    this.showCustomerModal = false;
  }

  async saveCustomer(customer: Customer) {
    if (!customer) return;

    if (!customer.name || !customer.name.trim()) {
      this.notification.warning('Vui lòng nhập tên khách hàng!');
      return;
    }

    if (customer.id === 0 || !customer.id) {
      // XÁC NHẬN TẠO MỚI
      const confirmed = await this.notification.confirm({
        title: 'Xác nhận tạo mới',
        message: `Bạn có chắc muốn tạo khách hàng "${customer.name}"?`,
        confirmText: 'Tạo mới',
        cancelText: 'Hủy'
      });

      if (!confirmed) return;

      this.customerService.createCustomer(customer).subscribe({
        next: () => {
          this.notification.success('Đã tạo mới khách hàng thành công!');
          this.closeModal();
          this.loadCustomers();
        },
        error: () => this.notification.error('Có lỗi khi tạo mới khách hàng!')
      });
    } else {
      // XÁC NHẬN CẬP NHẬT
      const confirmed = await this.notification.confirm({
        title: 'Xác nhận cập nhật',
        message: `Bạn có chắc muốn cập nhật thông tin khách hàng "${customer.name}"?`,
        confirmText: 'Cập nhật',
        cancelText: 'Hủy'
      });

      if (!confirmed) return;

      this.customerService.updateCustomer(customer.id, customer).subscribe({
        next: () => {
          this.notification.success('Đã cập nhật khách hàng thành công!');
          this.closeModal();
          this.loadCustomers();
        },
        error: () => this.notification.error('Có lỗi khi cập nhật khách hàng!')
      });
    }
  }

  async deleteCustomer(customer: Customer) {
    // XÁC NHẬN XÓA KHÁCH HÀNG
    const confirmed = await this.notification.confirm({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc muốn xóa khách hàng "${customer.name}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;
    
    this.customerService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.notification.success('Đã xóa khách hàng thành công!');
        this.loadCustomers();
      },
      error: () => this.notification.error('Có lỗi xảy ra khi xóa khách hàng!')
    });
  }


toggleColumnPanel(event: MouseEvent) {
  event.stopPropagation();
  const currentState = this.showColumnPanel;
  this.closeAllDropdowns();
  this.showColumnPanel = !currentState;
}

toggleGroupDropdown() {
  const currentState = this.showGroupDropdown;
  this.closeAllDropdowns();
  this.showGroupDropdown = !currentState;
}

toggleSearchTypeDropdown() {
  const currentState = this.showSearchTypeDropdown;
  this.closeAllDropdowns();
  this.showSearchTypeDropdown = !currentState;
}

private closeAllDropdowns(): void {
  this.showGroupDropdown = false;
  this.showSearchTypeDropdown = false;
  this.showColumnPanel = false;
}



  // ===== GROUP MANAGEMENT =====
  
  getSelectedGroupText(): string {
    if (this.filterCustomer.groupID == null) {
      return 'Tất cả';
    }
    const selected = this.groups.find(g => g.id === this.filterCustomer.groupID);
    return selected ? `${selected.code} - ${selected.name}` : 'Tất cả';
  }
  selectGroup(groupId: number | null) {
    this.filterCustomer.groupID = groupId;
    this.showGroupDropdown = false;
    this.applyFilter();
  }

  openGroupModal() {
    this.editingGroup = null;
    this.showModal = true;
  }

  openGroupModalFromCustomer() {
    this.openGroupModal();
  }

  openEditGroupModal(group: any, event: Event) {
    event.stopPropagation();
    this.editingGroup = group;
    this.showModal = true;
    this.showGroupDropdown = false;
  }

  handleCloseModal() {
    this.showModal = false;
    this.editingGroup = null;
  }

  async handleSubmit(data: any) {
    if (this.editingGroup) {
      // XÁC NHẬN CẬP NHẬT NHÓM
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
          
          if (this.customerModalRef) {
            this.customerModalRef.refreshGroups();
          }
          
          this.handleCloseModal();
        },
        error: (err) => {
          console.error('Lỗi cập nhật:', err);
          let errorMessage = 'Có lỗi khi cập nhật nhóm';
          if (err.error?.Message || err.error?.message) {
            errorMessage = err.error.Message || err.error.message;
          }
          this.notification.error(errorMessage);
        }
      });
    } else {
      // XÁC NHẬN TẠO MỚI NHÓM
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
          
          if (this.customerModalRef) {
            this.customerModalRef.refreshGroups();
          }
          
          this.handleCloseModal();
        },
        error: (err) => {
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

  async handleDeleteGroup(group: any) {
    // XÁC NHẬN XÓA NHÓM
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
        
        if (this.customerModalRef) {
          this.customerModalRef.refreshGroups();
        }
        
        this.handleCloseModal();
        
        if (this.filterCustomer.groupID === group.id) {
          this.filterCustomer.groupID = null;
          this.applyFilter();
        }
      },
      error: (err) => {
        let errorMessage = 'Có lỗi khi xóa nhóm';
        if (err.error?.Message || err.error?.message) {
          errorMessage = err.error.Message || err.error.message;
        }
        this.notification.error(errorMessage);
      }
    });
  }

 @HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  
  // Kiểm tra xem click có nằm trong bất kỳ dropdown nào không
  const isInsideGroup = target.closest('.custom-group-select');
  const isInsideColumn = target.closest('.column-toggle-wrapper');
  
  if (!isInsideGroup && !isInsideColumn) {
    this.closeAllDropdowns();
  }
}
  showSearchTypeDropdown = false;

selectSearchType(type: string): void {
  this.searchType = type;
  this.showSearchTypeDropdown = false;
}

getSearchTypeText(): string {
  const map: { [key: string]: string } = {
    'name': 'Tên khách hàng',
    'taxCode': 'MST',
    'address': 'Địa chỉ',
    'phone': 'Điện thoại',
    'cccd': 'CCCD'
  };
  return map[this.searchType] || 'Tên khách hàng';
}
// Load visible columns from localStorage
private loadVisibleColumns(): VisibleColumns {
  const saved = localStorage.getItem('customer_visible_columns');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading visible columns:', e);
    }
  }
  
  // Default values nếu chưa có trong localStorage
  return {
    group: true,
    code: true,
    name: true,
    taxCode: true,
    cccd: true,
    phone: true,
    address: true,
    email: true
  };
}

// Save visible columns to localStorage
saveVisibleColumns(): void {
  localStorage.setItem('customer_visible_columns', JSON.stringify(this.visibleColumns));
}

}