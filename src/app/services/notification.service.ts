import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  callback: (result: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  private confirmSubject = new Subject<ConfirmDialogData>();

  notifications$ = this.notificationSubject.asObservable();
  confirmDialog$ = this.confirmSubject.asObservable();

  success(message: string, duration: number = 3000) {
    this.show('success', message, duration);
  }

  error(message: string, duration: number = 4000) {
    this.show('error', message, duration);
  }

  warning(message: string, duration: number = 3000) {
    this.show('warning', message, duration);
  }

  info(message: string, duration: number = 3000) {
    this.show('info', message, duration);
  }

  private show(type: Notification['type'], message: string, duration: number) {
    const notification: Notification = {
      id: Math.random().toString(36).substring(7),
      type,
      message,
      duration
    };
    this.notificationSubject.next(notification);
  }

  confirm(data: Omit<ConfirmDialogData, 'callback'>): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmSubject.next({
        ...data,
        callback: resolve
      });
    });
  }
}