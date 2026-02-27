import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Customer } from '../../models/customer';
import { Group } from '../../models/group';
import { GroupService } from '../../services/group.service';
import { GroupModalComponent } from '../group-modal/group-modal.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, GroupModalComponent],
  templateUrl: './customer-modal.component.html',
  styleUrls: ['./customer-modal.component.css']
})
export class CustomerModalComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() editingCustomer: Customer | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Customer>();
  
  @ViewChild('customerForm') customerForm!: NgForm;

  customer: Customer = this.getEmptyCustomer();

  groups: Group[] = [];
  submitted: boolean = false;

  showGroupModal: boolean = false;
  editingGroup: any = null;

  phoneError: string = '';
  cccdError: string = '';
  taxCodeError: string = '';
  emailError: string = ''; // ✅ THÊM: Lỗi email

  constructor(private groupService: GroupService, private notificationService: NotificationService) {}

  ngOnInit() {
    this.loadGroups();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible) {
      if (this.editingCustomer) {
        this.customer = { ...this.editingCustomer };
      } else {
        this.customer = this.getEmptyCustomer();
      }
      
      if (!this.customer.groupID) {
        this.customer.groupID = null as any;
      }
      
      this.submitted = false;
      this.phoneError = '';
      this.cccdError = '';
      this.emailError = ''; // ✅ THÊM: Reset lỗi email
    }
    
    if (changes['editingCustomer'] && this.editingCustomer) {
      this.customer = { ...this.editingCustomer };
    }
  }

  getEmptyCustomer(): Customer {
    return {
      id: 0,
      name: '',
      phone: '',
      email: '',
      address: '',
      cccd: '',
      groupID: null as any,
      code: ''
    };
  }

  loadGroups() {
    this.groupService.getAllGroups('customer').subscribe({
      next: (data) => {
        this.groups = data;
      },
      error: (err) => {
        console.error('Lỗi tải danh sách nhóm:', err);
      }
    });
  }

  public refreshGroups() {
    this.loadGroups();
  }

  validatePhone() {
    this.phoneError = '';
    if (!this.customer.phone || this.customer.phone.trim() === '') {
      return;
    }

    const phone = this.customer.phone.trim();
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      this.phoneError = 'SĐT phải có 10 số và bắt đầu bằng 0';
    }
  }

  validateCCCD() {
    this.cccdError = '';
    if (!this.customer.cccd || this.customer.cccd.trim() === '') {
      return;
    }

    const cccd = this.customer.cccd.trim();
    const cccdRegex = /^[0-9]{12}$/;
    
    if (!cccdRegex.test(cccd)) {
      this.cccdError = 'CCCD phải có 12 số';
    }
  }

  // ✅ THÊM: Validation cho email
  validateEmail() {
    this.emailError = '';
    if (!this.customer.email || this.customer.email.trim() === '') {
      return;
    }

    const email = this.customer.email.trim();
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      this.emailError = 'Email không hợp lệ';
    }
  }
  // ✅ THÊM hàm này
  validateTaxCode() {
  this.taxCodeError = '';
  if (!this.customer.taxCode || this.customer.taxCode.trim() === '') {
    return;
  }

  const taxCode = this.customer.taxCode.trim();
  const taxCodeRegex = /^[0-9]{10}(-[0-9]{3})?$/;
  
  if (!taxCodeRegex.test(taxCode)) {
    this.taxCodeError = 'Mã số thuế phải có 10 số hoặc 10 số + 3 số (VD: 0123456789 hoặc 0123456789-001)';
  }
}

  openAddGroup() {
    this.editingGroup = null;
    this.showGroupModal = true;
  }

  handleCloseGroupModal() {
    this.showGroupModal = false;
    this.editingGroup = null;
  }

  handleSubmitGroup(data: any) {
    if (this.editingGroup) {
      this.groupService.updateGroup(this.editingGroup.id, data).subscribe({
        next: () => {
          this.notificationService.success('Đã cập nhật nhóm!');
          this.loadGroups();
          this.handleCloseGroupModal();
        },
        error: (err) => {
          this.notificationService.error('Có lỗi khi cập nhật nhóm');
        }
      });
    } else {
      this.groupService.createGroup(data).subscribe({
        next: () => {
          this.notificationService.success('Đã tạo nhóm mới thành công!');
          this.loadGroups();
          this.handleCloseGroupModal();
        },
        error: (err) => {
          this.notificationService.error('Có lỗi khi tạo nhóm');
        }
      });
    }
  }

  async handleDeleteGroup(group: any) {
    const confirmed = await this.notificationService.confirm({
      title: 'Xác nhận xóa nhóm',
      message: `Bạn có chắc chắn muốn xóa nhóm "${group.name}"?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      this.groupService.deleteGroup(group.id).subscribe({
        next: () => {
          this.notificationService.success('Đã xóa nhóm!');
          this.loadGroups();
          this.handleCloseGroupModal();
        },
        error: (err) => {
          this.notificationService.error('Có lỗi khi xóa nhóm');
        }
      });
    }
  }

  // ✅ CẬP NHẬT: Thêm kiểm tra email
  saveModal() {
    this.submitted = true;

    this.validatePhone();
    this.validateCCCD();
    this.validateEmail(); // ✅ THÊM: Kiểm tra email
    this

    if (this.customerForm) {
      Object.keys(this.customerForm.controls).forEach(key => {
        this.customerForm.controls[key].markAsTouched();
      });
    }

    // ✅ CẬP NHẬT: Thêm điều kiện kiểm tra emailError và taxCodeError
    if (this.customerForm && this.customerForm.valid && !this.phoneError && !this.cccdError && !this.emailError && !this.taxCodeError) {
      this.save.emit(this.customer);
      this.submitted = false;
      this.phoneError = '';
      this.cccdError = '';
      this.emailError = ''; // ✅ THÊM: Reset lỗi email
      this.taxCodeError = ''; // ✅ THÊM: Reset lỗi mã số thuế
    } else {
      // ✅ CẬP NHẬT: Hiển thị lỗi email
      if (this.phoneError) {
        this.notificationService.warning(this.phoneError);
      } else if (this.cccdError) {
        this.notificationService.warning(this.cccdError);
      } else if (this.emailError) {
        this.notificationService.warning(this.emailError);
      } else if (this.taxCodeError) {
        this.notificationService.warning(this.taxCodeError);
      } else {
        this.notificationService.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
      }
    }
  }

  closeModal() {
    this.submitted = false;
    this.phoneError = '';
    this.cccdError = '';
    this.emailError = ''; // ✅ THÊM: Reset lỗi email
    this.taxCodeError = ''; // ✅ THÊM: Reset lỗi mã số thuế
    this.close.emit();
  }

  showCustomerGroupDropdown = false;

  getCustomerSelectedGroupText(): string {
    if (this.customer.groupID === undefined) return 'Chọn nhóm';
    const g = this.groups.find(g => g.id === this.customer.groupID);
    return g ? `${g.code} - ${g.name}` : 'Chọn nhóm';
  }

  editCustomerGroup(group: any, event: Event): void {
    event.stopPropagation();
    this.showCustomerGroupDropdown = false;
    this.editingGroup = group;
    this.showGroupModal = true;
  }
  removeReadonly(event: Event): void {
  (event.target as HTMLElement).removeAttribute('readonly');
}
}