import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableService, TableStatus } from '../../services/table.service';

interface Table {
  id: number;
  name: string;
  tableGroupName: string;
  capacity: number;
  status: TableStatus;
}

interface TableGroup {
  name: string;
  tables: Table[];
}

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit {

  tables: Table[] = [];
  groups: TableGroup[] = [];

  constructor(
    private tableService: TableService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTables();
  }

  loadTables() {
    this.tableService.getTables().subscribe({
      next: (data: Table[]) => {
        this.tables = data;
        this.buildGroups();
      },
      error: (err: any) => console.error(err)
    });
  }

  buildGroups() {
    const map = new Map<string, Table[]>();

    this.tables.forEach(t => {
      if (!map.has(t.tableGroupName)) {
        map.set(t.tableGroupName, []);
      }
      map.get(t.tableGroupName)!.push(t);
    });

    this.groups = Array.from(map.entries()).map(([name, tables]) => ({
      name,
      tables
    }));
  }

  // ===== COUNTS =====
  get servingCount() {
    return this.tables.filter(t => t.status === 'serving').length;
  }

  get emptyCount() {
    return this.tables.filter(t => t.status === 'empty').length;
  }

  get reservedCount() {
    return this.tables.filter(t => t.status === 'reserved').length;
  }

  getStatusText(status: TableStatus): string {
    return status === 'empty'
      ? 'Trống'
      : status === 'serving'
      ? 'Đang phục vụ'
      : 'Đã đặt';
  }

  openTable(table: Table) {
    if (table.status === 'reserved') {
      alert('Bàn đã được đặt trước');
      return;
    }
    this.router.navigate(['/tables', table.id, 'invoice']);
  }

  confirmReserved(table: Table) {
    this.tableService.updateStatus(table.id, 'serving')
      .subscribe(() => table.status = 'serving');
  }
}
