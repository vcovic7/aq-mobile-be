import { Component, OnInit, ViewChildren, QueryList } from '@angular/core';

import { Platform, IonRouterOutlet, ModalController, NavController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Router, NavigationEnd } from '@angular/router';
import { PushNotificationsService } from './services/push-notifications/push-notifications.service';
import { InfoOverlayService, DrawerState } from './services/overlay-info-drawer/overlay-info-drawer.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {

  @ViewChildren(IonRouterOutlet) routerOutlets: QueryList<IonRouterOutlet>;

  private lastNavigation = ['tabs/start', 'tabs/start', 'tabs/start'];
  private lastNavigationStep = 1;

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    public router: Router,
    private pushNotifications: PushNotificationsService,
    private modalCtrl: ModalController,
    private infoOverlay: InfoOverlayService,
    private navCtrl: NavController
  ) {
    this.initializeApp();
    this.backButtonEvent();
    this.storeLastNavigation();
  }

  backButtonEvent() {
    this.platform.backButton.subscribe(() => {
      this.routerOutlets.forEach(async (outlet: IonRouterOutlet) => {
        const modal = await this.modalCtrl.getTop();
        if (modal) {
          modal.dismiss();
        } else if (this.infoOverlay.rawState.value === DrawerState.Open) {
          this.infoOverlay.openClose();
        } else if (this.router.url === '/tabs/start') {
          navigator['app'].exitApp();
        } else {
          this.router.navigateByUrl(this.lastNavigation[this.lastNavigationStep]);
          this.lastNavigationStep -= 2;
        }
      });
    });
  }

  public storeLastNavigation(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(({ urlAfterRedirects }: NavigationEnd) => {
        if (this.lastNavigationStep < 1) {
          this.lastNavigationStep++;
        }
        this.lastNavigation = ['tabs/start', this.lastNavigation[2], urlAfterRedirects];
      });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // this.statusBar.styleDefault();
      this.statusBar.show();
      this.splashScreen.hide();
      this.pushNotifications.init();
    });
  }
}
