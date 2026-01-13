import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableService, ApiTable, TableStatus } from '../../services/table.service';
import { TableGroupService, TableGroup } from '../../services/table-group.service';
import { InvoiceService } from '../../services/invoice.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Mở rộng ApiTable interface với thông tin invoice
interface ExtendedApiTable extends ApiTable {
  customerName?: string;
  customerPhone?: string;
  startDate?: Date | string;
  totalAmount?: number;
  invoiceId?: number;
  serviceMinutes?: number;
}

interface ExtendedTableGroup extends Omit<TableGroup, 'tables'> {
  tables: ExtendedApiTable[];
}

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit {

  groups: ExtendedTableGroup[] = [];
  selectedGroupId = 0;
  visibleGroups: ExtendedTableGroup[] = [];

  newGroupName = '';
  newTableName = '';

  // Thêm biến cho dialog xác nhận
  showConfirmDialog = false;
  pendingTable: ExtendedApiTable | null = null;

  constructor(
    private tableService: TableService,
    private tableGroupService: TableGroupService,
    private invoiceService: InvoiceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    
    // Auto refresh mỗi 30 giây để cập nhật thời gian và số tiền
    setInterval(() => {
      this.loadData();
    }, 30000);
  }

  loadData() {
    this.tableGroupService.getGroups().subscribe({
      next: (groups) => {
        console.log('✅ API Response:', groups);
        
        // Lấy danh sách tất cả các bàn đang serving để load invoice info
        const servingTables: ExtendedApiTable[] = [];
        groups.forEach(group => {
          group.tables.forEach(table => {
            if (table.status === 'serving') {
              servingTables.push(table as ExtendedApiTable);
            }
          });
        });

        // Load invoice info cho tất cả bàn đang serving
        if (servingTables.length > 0) {
          const invoiceRequests = servingTables.map(table => 
            this.invoiceService.getInvoiceByTable(table.id).pipe(
              map(invoice => {
                // Load invoice items để tính tổng tiền
                return this.invoiceService.getInvoiceItems(invoice.id).pipe(
                  map(items => {
                    const subTotal = items.reduce((sum, item) => 
                      sum + (item.unitPrice * item.quantity), 0
                    );
                    const vat = subTotal * 0.1;
                    const total = subTotal + vat;
                    
                    return {
                      tableId: table.id,
                      invoiceId: invoice.id,
                      startDate: invoice.invoiceDate,
                      totalAmount: total,
                      serviceMinutes: Math.floor(
                        (Date.now() - new Date(invoice.invoiceDate).getTime()) / 60000
                      ),
                      customerName: invoice.customerName || '',
                      customerPhone: invoice.customerPhone || ''
                    };
                  }),
                  catchError(() => of(null))
                );
              }),
              catchError(() => of(of(null)))
            )
          );

          // Chờ tất cả requests hoàn thành
          forkJoin(invoiceRequests).subscribe(observables => {
            forkJoin(observables.filter(obs => obs !== null)).subscribe(invoiceInfos => {
              // Map invoice info vào tables
              const invoiceMap = new Map();
              invoiceInfos.forEach(info => {
                if (info) {
                  invoiceMap.set(info.tableId, info);
                }
              });

              // Cập nhật groups với invoice info
              this.groups = groups.map(group => ({
                ...group,
                tables: group.tables.map(table => {
                  const extendedTable = table as ExtendedApiTable;
                  
                  // Nếu bàn đang serving và có invoice info
                  if (table.status === 'serving' && invoiceMap.has(table.id)) {
                    const invoiceInfo = invoiceMap.get(table.id);
                    return {
                      ...extendedTable,
                      invoiceId: invoiceInfo.invoiceId,
                      startDate: invoiceInfo.startDate,
                      totalAmount: invoiceInfo.totalAmount,
                      serviceMinutes: invoiceInfo.serviceMinutes,
                      customerName: invoiceInfo.customerName,
                      customerPhone: invoiceInfo.customerPhone
                    };
                  }
                  
                  return extendedTable;
                })
              }));
              
              this.updateVisibleGroups();
            });
          });
        } else {
          // Không có bàn nào đang serving
          this.groups = groups.map(group => ({
            ...group,
            tables: group.tables.map(table => table as ExtendedApiTable)
          }));
          
          this.updateVisibleGroups();
        }
      },
      error: (err) => {
        console.error('❌ API Error:', err);
      }
    });
  }

  updateVisibleGroups() {
    console.log('updateVisibleGroups called, selectedGroupId:', this.selectedGroupId);
    
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

  getStatusText(status: TableStatus) {
    return status === 'empty'
      ? 'Trống'
      : status === 'serving'
      ? 'Phục vụ'
      : 'Đã đặt';
  }

  // Hiển thị thời gian phục vụ
  getServiceTimeText(table: ExtendedApiTable): string {
    if (!table.serviceMinutes) return 'Chưa mở';
    
    const hours = Math.floor(table.serviceMinutes / 60);
    const mins = table.serviceMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}p`;
    }
    return `${mins} phút`;
  }

  // Click vào bàn - Xử lý theo từng trạng thái
  openTable(table: ExtendedApiTable) {
    if (table.status === 'empty') {
      // Hiển thị dialog xác nhận
      this.pendingTable = table;
      this.showConfirmDialog = true;
    } else if (table.status === 'serving') {
      this.viewCurrentInvoice(table);
    } else if (table.status === 'reserved') {
      alert('Bàn này đã được đặt trước. Nhấn "Xác nhận khách tới" để bắt đầu phục vụ.');
    }
  }

  // Xác nhận mở bàn
  confirmOpenTable() {
    if (this.pendingTable) {
      this.createNewInvoice(this.pendingTable);
      this.closeConfirmDialog();
    }
  }

  // Hủy mở bàn
  closeConfirmDialog() {
    this.showConfirmDialog = false;
    this.pendingTable = null;
  }

  createNewInvoice(table: ExtendedApiTable) {
    console.log('🔓 Creating new invoice for table:', table.id);

    this.tableService.openTable(table.id).subscribe({
      next: (response) => {
        console.log('✅ Invoice created:', response);
        table.status = 'serving';
        this.loadData();
        this.router.navigate(['/tables', table.id, 'invoice']);
      },
      error: (err) => {
        console.error('❌ Error creating invoice:', err);
        alert('Không thể mở bàn! ' + (err.error?.message || err.message || ''));
      }
    });
  }

  viewCurrentInvoice(table: ExtendedApiTable) {
    console.log('👀 Viewing current invoice for table:', table.id);
    this.router.navigate(['/tables', table.id, 'invoice']);
  }

  confirmReserved(table: ExtendedApiTable) {
    this.tableService.updateStatus(table.id, 'serving').subscribe({
      next: () => {
        console.log('✅ Table status updated to serving');
        table.status = 'serving';
        this.loadData();
        this.router.navigate(['/tables', table.id, 'invoice']);
      },
      error: (err) => {
        console.error('❌ Error confirming table:', err);
        alert('Không thể xác nhận bàn!');
      }
    });
  }

  trackByGroupId(index: number, g: ExtendedTableGroup): number {
    return g.id;
  }
}