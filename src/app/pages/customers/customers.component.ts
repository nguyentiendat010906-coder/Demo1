import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { GroupService } from '../../services/group.service';
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
  selectedCustomer: Customer | null = null;
  groups: Group[] = [];
  
  // Filter customer
  filterCustomer = {
    groupID: null as number | null
  };
  
  // Modal states
  showModal: boolean = false;
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
  visibleColumns: VisibleColumns = {
    group: true,
    code: true,
    name: true,
    taxCode: true,
    cccd: true,
    phone: true,
    address: true,
    email: true
  };

  // Custom dropdown
  showGroupDropdown = false;

  constructor(
    private customerService: CustomerService,
    private groupService: GroupService
  ) {}

  ngOnInit() {
    this.loadCustomers();
    this.loadGroups();
  }

  loadCustomers() {
    this.customerService.getAllCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.filteredCustomers = data;
        this.totalItems = data.length;
      },
      error: (err) => {
        console.error('Lỗi tải dữ liệu:', err);
        alert('Không thể tải danh sách khách hàng!');
      }
    });
  }

loadGroups() {
  // Chỉ lấy customer groups
  this.groupService.getAllGroups('customer').subscribe({
    next: (data) => {
      this.groups = data;
    },
    error: (err) => {
      console.error('Lỗi tải nhóm:', err);
    }
  });
}

  // Filter functions
  applyFilter() {
    let result = [...this.customers];
    
    if (this.filterCustomer.groupID !== null && this.filterCustomer.groupID !== undefined) {
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
    this.selectedYear = '2026';
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
    this.selectedCustomer = { ...customer };
  }

  createNew() {
    this.selectedCustomer = {
      id: 0,
      groupID: undefined,
      code: '',
      name: '',
      taxCode: '',
      cccd: '',
      phone: '',
      address: '',
      email: ''
    };
  }

  closeModal() {
    this.selectedCustomer = null;
  }

  saveCustomer(customer: Customer) {
    if (!customer) return;

    if (!customer.name?.trim()) {
      alert('Vui lòng nhập tên khách hàng!');
      return;
    }

    if (customer.id === 0) {
      this.customerService.createCustomer(customer).subscribe({
        next: () => {
          alert('Đã tạo mới khách hàng!');
          this.closeModal();
          this.loadCustomers();
        },
        error: () => alert('Có lỗi khi tạo mới!')
      });
    } else {
      this.customerService.updateCustomer(customer.id, customer).subscribe({
        next: () => {
          alert('Đã cập nhật khách hàng!');
          this.closeModal();
          this.loadCustomers();
        },
        error: () => alert('Có lỗi khi cập nhật!')
      });
    }
  }

  deleteCustomer(customer: Customer) {
    if (!confirm(`Bạn có chắc muốn xóa khách hàng "${customer.name}"?`)) return;
    
    this.customerService.deleteCustomer(customer.id).subscribe({
      next: () => {
        alert('Đã xóa khách hàng!');
        this.loadCustomers();
      },
      error: () => alert('Có lỗi xảy ra khi xóa!')
    });
  }

  toggleColumnPanel(event: MouseEvent) {
    event.stopPropagation();
    this.showColumnPanel = !this.showColumnPanel;
  }

  // ===== GROUP MANAGEMENT =====
  
  // Custom dropdown methods
  getSelectedGroupText(): string {
    if (this.filterCustomer.groupID === null || this.filterCustomer.groupID === undefined) {
      return 'Tất cả';
    }
    const selected = this.groups.find(g => g.id === this.filterCustomer.groupID);
    return selected ? `${selected.code} - ${selected.name}` : 'Tất cả';
  }

  toggleGroupDropdown() {
    this.showGroupDropdown = !this.showGroupDropdown;
  }

  selectGroup(groupId: number | null) {
    this.filterCustomer.groupID = groupId;
    this.showGroupDropdown = false;
    this.applyFilter();
  }

  // Modal methods
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

  handleSubmit(data: any) {
    if (this.editingGroup) {
      // Cập nhật nhóm
      this.groupService.updateGroup(this.editingGroup.id, data).subscribe({
        next: () => {
          alert('Đã cập nhật nhóm!');
          this.loadGroups();
          
          // Refresh groups trong customer modal nếu đang mở
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
          alert(errorMessage);
        }
      });
    } else {
      // Tạo mới nhóm
      this.groupService.createGroup(data).subscribe({
        next: () => {
          alert('Đã tạo nhóm mới thành công!');
          this.loadGroups();
          
          // Refresh groups trong customer modal nếu đang mở
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
          alert(errorMessage);
        }
      });
    }
  }

  handleUpdateGroup(data: any) {
    this.handleSubmit(data);
  }

  handleDeleteGroup(group: any) {
    this.groupService.deleteGroup(group.id).subscribe({
      next: () => {
        alert('Đã xóa nhóm!');
        this.loadGroups();
        
        // Refresh groups trong customer modal nếu đang mở
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
        alert(errorMessage);
      }
    });
  }

  // Đóng dropdown khi click ra ngoài
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-group-select')) {
      this.showGroupDropdown = false;
    }
  }
}