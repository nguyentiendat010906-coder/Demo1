import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-modal.component.html',
  styleUrls: ['./group-modal.component.css']
})
export class GroupModalComponent implements OnChanges {
  @Input() show: boolean = false;
  @Input() group: any = null;
  @Input() groupType: string = 'customer';
  
  @Output() closeModal = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();

  groupName: string = '';
  editMode: boolean = false;
  errorMessage: string = ''; // ← Thêm biến lỗi

  ngOnChanges() {
    if (this.group) {
      this.editMode = true;
      this.groupName = this.group.name || '';
    } else {
      this.editMode = false;
      this.groupName = '';
    }
    this.errorMessage = ''; // Reset lỗi
  }

  close() {
    this.closeModal.emit();
    this.groupName = '';
    this.errorMessage = ''; // Reset lỗi
  }

  submit() {
    // Validate
    if (!this.groupName.trim()) {
      this.errorMessage = 'Vui lòng nhập tên nhóm!'; // ← Hiển thị lỗi
      return;
    }

    this.errorMessage = ''; // Clear lỗi nếu hợp lệ

    const data = {
      name: this.groupName.trim(),
      type: this.groupType
    };

    this.onSubmit.emit(data);
    this.groupName = '';
  }

  deleteGroup() {
    if (!this.group) return;
    
    if (confirm(`Bạn có chắc muốn xóa nhóm "${this.group.name}"?`)) {
      this.onDelete.emit(this.group);
    }
  }
}