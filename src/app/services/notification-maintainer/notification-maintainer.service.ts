import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { TranslateService } from '@ngx-translate/core';
import { Observable, ReplaySubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { PushNotificationsHandlerService } from '../push-notifications-handler/push-notifications-handler.service';
import {
  PushNotification,
  PushNotificationsService,
  PushNotificationTopic,
} from '../push-notifications/push-notifications.service';
import { USER_LOCATION_NOTIFICATION_TOPIC_PREFIX } from '../user-location-notifications/user-location-topic-generator.service';

const NOTIFICATION_PARAM = 'notifications';

const URL_NOTIFICATION_BRUSSELS_FR = 'https://www.irceline.be/air/belair/channel/brussels_fr.json';
const URL_NOTIFICATION_BRUSSELS_NL = 'https://www.irceline.be/air/belair/channel/brussels_nl.json';
const URL_NOTIFICATION_FLANDERS = 'https://www.irceline.be/air/belair/channel/flanders.json';
const URL_NOTIFICATION_WALLONIA = 'https://www.irceline.be/air/belair/channel/wallonia.json';

@Injectable()
export class NotificationMaintainerService {

  private notificationsReplay: ReplaySubject<Map<string, PushNotification[]>> = new ReplaySubject(1);
  private notifications: Map<string, PushNotification[]> = new Map();

  constructor(
    private storage: Storage,
    private httpClient: HttpClient,
    private translate: TranslateService,
    private pushNotificationHandler: PushNotificationsHandlerService,
    private pushNotificationService: PushNotificationsService
  ) {
    this.storage.get(NOTIFICATION_PARAM)
      .then(res => this.initNotifications(res))
      .catch(() => this.setNotifications(null));
    setInterval(() => this.saveNotifications(), 10000);
  }

  private initNotifications(res: any) {
    if (res !== undefined) {
      this.setNotifications(this.deserializeNotifications(res));
    } else {
      this.setNotifications(new Map());
    }
    this.pushNotificationService.notificationReceived.subscribe(notification => this.addNotification(notification));
  }

  private setNotifications(notificationMap: Map<string, PushNotification[]>) {
    // temporary cleanup for old entries
    notificationMap.forEach((v, k) => {
      if (k !== PushNotificationTopic.brussels && k !== PushNotificationTopic.wallonia && k !== PushNotificationTopic.flanders) {
        notificationMap.delete(k);
      }
    });

    if (this.pushNotificationHandler.isTopicActive(PushNotificationTopic.wallonia)
      && !notificationMap.get(PushNotificationTopic.wallonia)) {
      this.loadServedNotification(URL_NOTIFICATION_WALLONIA);
    }
    if (this.pushNotificationHandler.isTopicActive(PushNotificationTopic.flanders)
      && !notificationMap.get(PushNotificationTopic.flanders)) {
      this.loadServedNotification(URL_NOTIFICATION_FLANDERS);
    }
    if (this.pushNotificationHandler.isTopicActive(PushNotificationTopic.brussels)
      && !notificationMap.get(PushNotificationTopic.brussels)) {
      // request notification based on language
      switch (this.translate.currentLang) {
        case 'nl':
          this.loadServedNotification(URL_NOTIFICATION_BRUSSELS_NL);
          break;
        case 'fr':
          this.loadServedNotification(URL_NOTIFICATION_BRUSSELS_FR);
          break;
        case 'de':
        case 'en':
          this.loadServedNotification(URL_NOTIFICATION_BRUSSELS_NL);
          this.loadServedNotification(URL_NOTIFICATION_BRUSSELS_FR);
          break;
      }
    }
    this.notifications = notificationMap;
    this.saveNotifications();
  }

  private loadServedNotification(url: string) {
    this.httpClient.get(url).subscribe((res: any) => {
      if (res && res.data && res.data.expiration) {
        res.data.expiration = new Date(res.data.expiration);
        this.addNotification(res.data);
      }
    });
  }

  public getNotifications(): Observable<Map<string, PushNotification[]>> {
    return this.notificationsReplay.asObservable();
  }

  public hasNotifications(): Observable<boolean> {
    return this.notificationsReplay.asObservable().pipe(map(e => e.size > 0));
  }

  public addNotification(notification: PushNotification) {
    const key = this.generateKey(notification);
    if (this.notifications.has(key)) {
      const walloniaActive = this.pushNotificationHandler.isTopicActive(PushNotificationTopic.wallonia);
      const flandersActive = this.pushNotificationHandler.isTopicActive(PushNotificationTopic.flanders);
      const isFr = notification.topic.indexOf('fr') > -1;
      const isNl = notification.topic.indexOf('nl') > -1;
      if ((walloniaActive && !flandersActive && isFr) || (flandersActive && !walloniaActive && isNl)) {
        this.notifications.get(key).unshift(notification);
      } else {
        this.notifications.get(key).push(notification);
      }
    } else {
      this.notifications.set(key, [notification]);
    }
    this.saveNotifications();
  }

  private saveNotifications() {
    this.filterNotifications();
    this.storage.set(NOTIFICATION_PARAM, this.serializeNotifications(this.notifications));
    this.notificationsReplay.next(this.notifications);
  }

  private serializeNotifications(notifications: Map<string, PushNotification[]>): any {
    const serialized = {};
    notifications.forEach((val, key) => serialized[key] = val);
    return serialized;
  }

  private deserializeNotifications(res: any): Map<string, PushNotification[]> {
    const deserialized = new Map();
    for (const key in res) {
      if (res.hasOwnProperty(key)) {
        const elem = res[key];
        if (elem.length > 0) {
          elem.forEach(e => e.expiration = new Date(e.expiration));
          deserialized.set(key, elem);
        }
      }
    }
    return deserialized;
  }

  private generateKey(notification: PushNotification): string {
    const idx = notification.topic.indexOf('_') === -1 ? notification.topic.length : notification.topic.indexOf('_');
    const trimmedTopic = notification.topic.substring(0, idx);
    return `${trimmedTopic}`;
  }

  private filterNotifications() {
    this.notifications.forEach((val, key) => {
      if (val.length) {
        if (val[0].expiration.getTime() < new Date().getTime()) {
          this.notifications.delete(key);
        }
      } else {
        this.notifications.delete(key);
      }
    });
  }
}
