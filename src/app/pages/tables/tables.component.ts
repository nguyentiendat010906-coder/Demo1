import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableService, ApiTable, TableStatus } from '../../services/table.service';
import { TableGroupService, TableGroup } from '../../services/table-group.service';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit {

  groups: TableGroup[] = [];
  selectedGroupId = 0;
  visibleGroups: TableGroup[] = [];

  newGroupName = '';
  newTableName = '';

  constructor(
    private tableService: TableService,
    private tableGroupService: TableGroupService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.tableGroupService.getGroups().subscribe({
      next: (groups) => {
        console.log('✅ API Response:', groups);
        this.groups = groups;
        this.updateVisibleGroups();
      },
      error: (err) => {
        console.error('❌ API Error:', err);
      }
    });
  }

  updateVisibleGroups() {
    console.log('updateVisibleGroups called, selectedGroupId:', this.selectedGroupId);
    console.log('All groups:', this.groups);
    
    if (this.selectedGroupId === 0) {
      this.visibleGroups = this.groups;
    } else {
      this.visibleGroups = this.groups.filter(g => g.id === this.selectedGroupId);
    }
    
    console.log('visibleGroups:', this.visibleGroups);
  }

  onGroupChange(value: any) {
    this.selectedGroupId = Number(value);
    console.log('onGroupChange called with value:', this.selectedGroupId);
    this.updateVisibleGroups();
  }

  // ===== STATS =====
  get totalTablesCount(): number {
    return this.visibleGroups.reduce((sum, g) => sum + g.tables.length, 0);
  }

  get servingCount(): number {
    return this.visibleGroups.reduce(
      (sum, g) => sum + g.tables.filter(t => t.status === 'serving').length,
      0
    );
  }

  get emptyCount(): number {
    return this.visibleGroups.reduce(
      (sum, g) => sum + g.tables.filter(t => t.status === 'empty').length,
      0
    );
  }

  get reservedCount(): number {
    return this.visibleGroups.reduce(
      (sum, g) => sum + g.tables.filter(t => t.status === 'reserved').length,
      0
    );
  }

  getStatusText(status: TableStatus) {
    return status === 'empty'
      ? 'Trống'
      : status === 'serving'
      ? 'Đang phục vụ'
      : 'Đã đặt';
  }

  // ✅ FIX: Mở bàn - Gọi API và cập nhật status
  // ✅ FIX: Click vào bàn - Xử lý theo từng trạng thái
openTable(table: ApiTable) {
  if (table.status === 'empty') {
    // Bàn trống → Tạo invoice mới
    this.createNewInvoice(table);
  } else if (table.status === 'serving') {
    // Bàn đang phục vụ → Xem invoice hiện tại
    this.viewCurrentInvoice(table);
  } else if (table.status === 'reserved') {
    // Bàn đặt trước → Hiển thị thông báo
    alert('Bàn này đã được đặt trước. Nhấn "Xác nhận khách tới" để bắt đầu phục vụ.');
  }
}

// Tạo invoice mới cho bàn trống
createNewInvoice(table: ApiTable) {
  console.log('🔓 Creating new invoice for table:', table.id);

  this.tableService.openTable(table.id).subscribe({
    next: (response) => {
      console.log('✅ Invoice created:', response);
      
      // Cập nhật status
      table.status = 'serving';
      
      // Navigate đến invoice mới
      this.router.navigate(['/tables', table.id, 'invoice']);
    },
    error: (err) => {
      console.error('❌ Error creating invoice:', err);
      alert('Không thể mở bàn! ' + (err.error?.message || err.message || ''));
    }
  });
}

// Xem invoice hiện tại của bàn đang phục vụ
viewCurrentInvoice(table: ApiTable) {
  console.log('👀 Viewing current invoice for table:', table.id);
  
  // Navigate trực tiếp đến invoice
  this.router.navigate(['/tables', table.id, 'invoice']);
}

// Xác nhận bàn đặt trước
confirmReserved(table: ApiTable) {
  this.tableService.updateStatus(table.id, 'serving').subscribe({
    next: () => {
      console.log('✅ Table status updated to serving');
      table.status = 'serving';
      // Navigate đến invoice
      this.router.navigate(['/tables', table.id, 'invoice']);
    },
    error: (err) => {
      console.error('❌ Error confirming table:', err);
      alert('Không thể xác nhận bàn!');
    }
  });
}

  // ✅ FIX: Xác nhận bàn đặt - Navigate sau khi update
 

  createGroup() {
    if (!this.newGroupName.trim()) return;
    
    this.tableGroupService.addGroup(this.newGroupName).subscribe({
      next: () => {
        console.log('✅ Group created');
        this.newGroupName = '';
        this.loadData();
      },
      error: (err) => {
        console.error('❌ Error creating group:', err);
        alert('Không thể tạo nhóm!');
      }
    });
  }

  createTable(groupId: number) {
    if (!this.newTableName.trim()) return;
    
    this.tableGroupService.addTable(groupId, this.newTableName).subscribe({
      next: () => {
        console.log('✅ Table created');
        this.newTableName = '';
        this.loadData();
      },
      error: (err) => {
        console.error('❌ Error creating table:', err);
        alert('Không thể tạo bàn!');
      }
    });
  }

  trackByGroupId(index: number, g: TableGroup): number {
    return g.id;
  }
}