import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification, ConfirmDialogData } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  confirmData: ConfirmDialogData | null = null;
  
  private subscriptions = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.subscriptions.add(
      this.notificationService.notifications$.subscribe(notification => {
        this.notifications.push(notification);
        
        if (notification.duration) {
          setTimeout(() => {
            this.remove(notification.id);
          }, notification.duration);
        }
      })
    );

    this.subscriptions.add(
      this.notificationService.confirmDialog$.subscribe(data => {
        this.confirmData = data;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  acceptConfirm() {
    if (this.confirmData) {
      this.confirmData.callback(true);
      this.confirmData = null;
    }
  }

  cancelConfirm() {
    if (this.confirmData) {
      this.confirmData.callback(false);
      this.confirmData = null;
    }
  }
}