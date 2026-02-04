import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TableService, ApiTable, TableStatus } from '../../services/table.service';
import { TableGroupService, TableGroup } from '../../services/table-group.service';
import { InvoiceService } from '../../services/invoice.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Extended interfaces
interface ExtendedApiTable extends ApiTable {
  customerName?: string;
  customerPhone?: string;
  startDate?: Date | string;
  totalAmount?: number;
  invoiceId?: number;
  serviceMinutes?: number;
  area?: string;
}

interface ExtendedTableGroup extends Omit<TableGroup, 'tables'> {
  tables: ExtendedApiTable[];
}

interface StatusItem {
  key: string;
  label: string;
  icon: string;
}

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  menuItemId?: number;
}

@Component({
  selector: 'app-table-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table-invoice.component.html',
  styleUrls: ['./table-invoice.component.css']
})
export class TableInvoiceComponent implements OnInit {
  // Tab và UI state

  activeTab: 'rooms' | 'menu' = 'rooms';
  searchQuery = '';
  customerSearch = '';
  selectedFilter = 'Tất cả';
  selectedStatus = 'all';
  autoOpenMenu = false;

  // Table management
  groups: ExtendedTableGroup[] = [];
  selectedGroupId = 0;
  visibleGroups: ExtendedTableGroup[] = [];
  allTables: ExtendedApiTable[] = [];
  selectedTable: ExtendedApiTable | null = null;

  // Dialog
  showConfirmDialog = false;
  pendingTable: ExtendedApiTable | null = null;

  // Order management
  orderCount = 1;
  orderItems: OrderItem[] = [];
  currentInvoiceId: number | null = null;

  // Filters
  filters: string[] = ['Tất cả'];
  statusList: StatusItem[] = [
    { key: 'all', label: 'Tất cả', icon: 'fa-solid fa-circle' },
    { key: 'empty', label: 'Còn trống', icon: 'fa-regular fa-circle' },
    { key: 'serving', label: 'Phục vụ', icon: 'fa-solid fa-circle-dot' },
    { key: 'reserved', label: 'Đã đặt', icon: 'fa-regular fa-circle-dot' }
  ];

  constructor(
    private tableService: TableService,
    private tableGroupService: TableGroupService,
    private invoiceService: InvoiceService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadData();
    
    // Auto refresh every 30 seconds
    setInterval(() => {
      this.loadData();
    }, 30000);
  }

  loadData() {
    this.tableGroupService.getGroups().subscribe({
      next: (groups) => {
        console.log('✅ Groups loaded:', groups);
        
        // Build filters from group names
        this.filters = ['Tất cả', ...groups.map(g => g.name)];
        
        // Collect all serving tables for invoice loading
        const servingTables: ExtendedApiTable[] = [];
        groups.forEach(group => {
          group.tables.forEach(table => {
            if (table.status === 'serving') {
              servingTables.push(table as ExtendedApiTable);
            }
          });
        });

        // Load invoice info for all serving tables
        if (servingTables.length > 0) {
          const invoiceRequests = servingTables.map(table => 
            this.invoiceService.getInvoiceByTable(table.id).pipe(
              map(invoice => {
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

          forkJoin(invoiceRequests).subscribe(observables => {
            forkJoin(observables.filter(obs => obs !== null)).subscribe(invoiceInfos => {
              const invoiceMap = new Map();
              invoiceInfos.forEach(info => {
                if (info) {
                  invoiceMap.set(info.tableId, info);
                }
              });

              // Update groups with invoice info
              this.groups = groups.map(group => ({
                ...group,
                tables: group.tables.map(table => {
                  const extendedTable = table as ExtendedApiTable;
                  extendedTable.area = group.name;
                  
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
              this.buildAllTables();
              this.updateStatusCount();
            });
          });
        } else {
          this.groups = groups.map(group => ({
            ...group,
            tables: group.tables.map(table => {
              const extendedTable = table as ExtendedApiTable;
              extendedTable.area = group.name;
              return extendedTable;
            })
          }));
          
          this.updateVisibleGroups();
          this.buildAllTables();
          this.updateStatusCount();
        }
      },
      error: (err) => {
        console.error('❌ Load data error:', err);
      }
    });
  }

  buildAllTables() {
    this.allTables = [];
    this.groups.forEach(group => {
      this.allTables.push(...group.tables);
    });
  }

  updateStatusCount() {
    const emptyCount = this.allTables.filter(t => t.status === 'empty').length;
    const servingCount = this.allTables.filter(t => t.status === 'serving').length;
    const reservedCount = this.allTables.filter(t => t.status === 'reserved').length;
    
    this.statusList = [
      { key: 'all', label: `Tất cả (${this.allTables.length})`, icon: 'fa-solid fa-circle' },
      { key: 'empty', label: `Còn trống (${emptyCount})`, icon: 'fa-regular fa-circle' },
      { key: 'serving', label: `Phục vụ (${servingCount})`, icon: 'fa-solid fa-circle-dot' },
      { key: 'reserved', label: `Đã đặt (${reservedCount})`, icon: 'fa-regular fa-circle-dot' }
    ];
  }

  updateVisibleGroups() {
    if (this.selectedGroupId === 0) {
      this.visibleGroups = this.groups;
    } else {
      this.visibleGroups = this.groups.filter(g => g.id === this.selectedGroupId);
    }
  }

  onGroupChange(value: any) {
    this.selectedGroupId = Number(value);
    this.updateVisibleGroups();
  }

  get tables(): ExtendedApiTable[] {
    let filtered = [...this.allTables];
    
    // Filter by area/group
    if (this.selectedFilter !== 'Tất cả') {
      filtered = filtered.filter(t => t.area === this.selectedFilter);
    }
    
    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(t => t.status === this.selectedStatus);
    }
    
    return filtered;
  }

  // UI Methods
  changeTab(tab: 'rooms' | 'menu'): void {
    this.activeTab = tab;
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
  }

  selectTable(table: ExtendedApiTable | null): void {
    this.selectedTable = table;
    
    // Load invoice items if table is serving
    if (table && table.status === 'serving' && table.invoiceId) {
      this.loadInvoiceItems(table.invoiceId);
      this.currentInvoiceId = table.invoiceId;
    } else {
      this.orderItems = [];
      this.currentInvoiceId = null;
    }
    
    if (this.autoOpenMenu && table) {
      this.activeTab = 'menu';
    }
  }

  loadInvoiceItems(invoiceId: number): void {
    this.invoiceService.getInvoiceItems(invoiceId).subscribe({
      next: (items) => {
        this.orderItems = items.map(item => ({
          id: item.id,
          name: item.menuItemName || 'Unknown',
          price: item.unitPrice,
          quantity: item.quantity,
          menuItemId: item.menuItemId
        }));
      },
      error: (err) => {
        console.error('❌ Error loading invoice items:', err);
      }
    });
  }

  // Table operations
  openTable(table: ExtendedApiTable) {
    if (table.status === 'empty') {
      this.pendingTable = table;
      this.showConfirmDialog = true;
    } else if (table.status === 'serving') {
      this.selectTable(table);
      this.viewCurrentInvoice(table);
    } else if (table.status === 'reserved') {
      if (confirm('Bàn này đã được đặt trước. Xác nhận khách đã tới?')) {
        this.confirmReserved(table);
      }
    }
  }

  confirmOpenTable() {
    if (this.pendingTable) {
      this.createNewInvoice(this.pendingTable);
      this.closeConfirmDialog();
    }
  }

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
        this.selectTable(table);
        this.loadData();
      },
      error: (err) => {
        console.error('❌ Error creating invoice:', err);
        alert('Không thể mở bàn! ' + (err.error?.message || err.message || ''));
      }
    });
  }

  viewCurrentInvoice(table: ExtendedApiTable) {
    console.log('👀 Viewing invoice for table:', table.id);
    this.selectTable(table);
  }

  confirmReserved(table: ExtendedApiTable) {
    this.tableService.updateStatus(table.id, 'serving').subscribe({
      next: () => {
        console.log('✅ Table status updated to serving');
        table.status = 'serving';
        this.selectTable(table);
        this.loadData();
      },
      error: (err) => {
        console.error('❌ Error confirming table:', err);
        alert('Không thể xác nhận bàn!');
      }
    });
  }

  getStatusText(status: TableStatus): string {
    const statusMap = {
      'empty': 'Trống',
      'serving': 'Phục vụ',
      'reserved': 'Đã đặt'
    };
    return statusMap[status] || status;
  }

  getServiceTimeText(table: ExtendedApiTable): string {
    if (!table.serviceMinutes) return 'Chưa mở';
    
    const hours = Math.floor(table.serviceMinutes / 60);
    const mins = table.serviceMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}p`;
    }
    return `${mins} phút`;
  }

  // Order management
  get totalAmount(): number {
    return this.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get itemCount(): number {
    return this.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  addNewItem(): void {
    console.log('Add new item clicked');
    // TODO: Open menu item selection dialog
  }

  addNewOrder(): void {
    this.orderCount++;
    console.log('Add new order clicked');
  }

  refreshOrders(): void {
    if (this.selectedTable && this.currentInvoiceId) {
      this.loadInvoiceItems(this.currentInvoiceId);
    }
    this.loadData();
  }

  notify(): void {
    alert('Thông báo đã được gửi!');
  }

  payment(): void {
    if (!this.selectedTable) {
      alert('Vui lòng chọn bàn trước khi thanh toán!');
      return;
    }
    
    if (this.orderItems.length === 0) {
      alert('Chưa có món trong đơn hàng!');
      return;
    }
    
    if (this.selectedTable.invoiceId) {
      // Navigate to payment page or show payment dialog
      this.router.navigate(['/tables', this.selectedTable.id, 'payment']);
    }
  }

  addMenuItem(item: OrderItem): void {
    const existing = this.orderItems.find(i => i.id === item.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.orderItems.push({ ...item, quantity: 1 });
    }
    // TODO: Update invoice in backend
  }

  removeMenuItem(itemId: number): void {
    if (confirm('Xóa món này khỏi đơn?')) {
      this.orderItems = this.orderItems.filter(i => i.id !== itemId);
      // TODO: Delete invoice item from backend
    }
  }

  updateQuantity(itemId: number, quantity: number): void {
    if (quantity < 1) {
      this.removeMenuItem(itemId);
      return;
    }
    
    const item = this.orderItems.find(i => i.id === itemId);
    if (item) {
      item.quantity = quantity;
      // TODO: Update invoice item quantity in backend
    }
  }

  trackByGroupId(index: number, g: ExtendedTableGroup): number {
    return g.id;
  }

  trackByTableId(index: number, t: ExtendedApiTable): number {
    return t.id;
  }
}