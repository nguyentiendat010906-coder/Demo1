import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableGroupService, TableGroup } from '../../services/table-group.service';

@Component({
  selector: 'app-table-setting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table-setting.component.html',
  styleUrls: ['./table-setting.component.css']
})
export class TableSettingComponent {

  groups: TableGroup[] = [];
  newGroupName = '';
  newTableNames: { [groupId: string]: string } = {}; // ✅ Đúng

  constructor(private tableGroupService: TableGroupService) {
    this.loadGroups();
  }

  loadGroups() {
    this.tableGroupService.getGroups().subscribe(res => {
      this.groups = res;
    });
  }

  createGroup() {
    if (!this.newGroupName.trim()) return;

    this.tableGroupService.addGroup(this.newGroupName).subscribe(() => {
      this.newGroupName = '';
      this.loadGroups();
    });
  }

  createTable(groupId: number) {
    const tableName = this.newTableNames[groupId]; // ✅ Sửa ở đây
    if (!tableName?.trim()) return;

    this.tableGroupService.addTable(groupId, tableName).subscribe(() => {
      this.newTableNames[groupId] = ''; // ✅ Sửa ở đây
      this.loadGroups();
    });
  }

  trackByGroupId(index: number, g: any) {
    return g.id;
  }
}