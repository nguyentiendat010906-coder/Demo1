import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TableGroup {
  id: string;
  name: string;
  tables: Table[];
}

export interface Table {
  id: string;
  name: string;
  groupId: string;
  status: 'available' | 'occupied' | 'reserved';
}

@Injectable({
  providedIn: 'root'
})
export class TableGroupService {
  private tableGroups = new BehaviorSubject<TableGroup[]>([
    {
      id: '1',
      name: 'Tầng 1',
      tables: [
        { id: '1-1', name: 'Bàn 1', groupId: '1', status: 'available' },
        { id: '1-2', name: 'Bàn 2', groupId: '1', status: 'occupied' }
      ]
    }
  ]);

  tableGroups$ = this.tableGroups.asObservable();

  addGroup(name: string) {
    const newGroup: TableGroup = {
      id: Date.now().toString(),
      name,
      tables: []
    };
    this.tableGroups.next([...this.tableGroups.value, newGroup]);
  }

  addTable(groupId: string, tableName: string) {
    const groups = this.tableGroups.value.map(group => {
      if (group.id === groupId) {
        const newTable: Table = {
          id: `${groupId}-${Date.now()}`,
          name: tableName,
          groupId,
          status: 'available'
        };
        return { ...group, tables: [...group.tables, newTable] };
      }
      return group;
    });
    this.tableGroups.next(groups);
  }

  deleteGroup(groupId: string) {
    this.tableGroups.next(
      this.tableGroups.value.filter(g => g.id !== groupId)
    );
  }

  deleteTable(groupId: string, tableId: string) {
    const groups = this.tableGroups.value.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          tables: group.tables.filter(t => t.id !== tableId)
        };
      }
      return group;
    });
    this.tableGroups.next(groups);
  }
}