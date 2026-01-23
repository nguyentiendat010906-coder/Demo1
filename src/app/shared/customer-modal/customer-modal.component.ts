import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Customer } from '../../models/customer';
import { Group } from '../../models/group';
import { GroupService } from '../../services/group.service';
import { GroupModalComponent } from '../group-modal/group-modal.component'; // THÊM

@Component({
  selector: 'app-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, GroupModalComponent], // THÊM GroupModalComponent
  templateUrl: './customer-modal.component.html',
  styleUrls: ['./customer-modal.component.css']
})
export class CustomerModalComponent implements OnInit, OnChanges {
  @Input() visible: boolean = false;
  @Input() customer!: Customer;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Customer>();
  
  @ViewChild('customerForm') customerForm!: NgForm;

  groups: Group[] = [];
  submitted: boolean = false;

  // THÊM CÁC BIẾN NÀY
  showGroupModal: boolean = false;
  editingGroup: any = null;

  constructor(private groupService: GroupService) {}

  ngOnInit() {
    this.loadGroups();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible && this.customer) {
      if (!this.customer.groupID) {
        this.customer.groupID = null as any;
      }
      this.submitted = false;
    }
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

  // MỞ MODAL THÊM NHÓM
  openAddGroup() {
    this.editingGroup = null;
    this.showGroupModal = true;
  }

  // ĐÓNG MODAL NHÓM
  handleCloseGroupModal() {
    this.showGroupModal = false;
    this.editingGroup = null;
  }

  // LƯU NHÓM
  handleSubmitGroup(data: any) {
    if (this.editingGroup) {
      this.groupService.updateGroup(this.editingGroup.id, data).subscribe({
        next: () => {
          alert('Đã cập nhật nhóm!');
          this.loadGroups();
          this.handleCloseGroupModal();
        },
        error: (err) => {
          alert('Có lỗi khi cập nhật nhóm');
        }
      });
    } else {
      this.groupService.createGroup(data).subscribe({
        next: () => {
          alert('Đã tạo nhóm mới thành công!');
          this.loadGroups();
          this.handleCloseGroupModal();
        },
        error: (err) => {
          alert('Có lỗi khi tạo nhóm');
        }
      });
    }
  }

  // XÓA NHÓM
  handleDeleteGroup(group: any) {
    this.groupService.deleteGroup(group.id).subscribe({
      next: () => {
        alert('Đã xóa nhóm!');
        this.loadGroups();
        this.handleCloseGroupModal();
      },
      error: (err) => {
        alert('Có lỗi khi xóa nhóm');
      }
    });
  }

  closeModal() {
    this.submitted = false;
    this.close.emit();
  }

  saveModal() {
    this.submitted = true;

    Object.keys(this.customerForm.controls).forEach(key => {
      this.customerForm.controls[key].markAsTouched();
    });

    if (this.customerForm.valid) {
      this.save.emit(this.customer);
      this.submitted = false;
    }
  }
}