import { EventEmitter, Injectable } from '@angular/core';
import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import { Platform } from 'ionic-angular/platform/platform';

@Injectable()
export class LocateProvider {

  public onPositionUpdate: EventEmitter<Geoposition> = new EventEmitter();

  constructor(
    private platform: Platform,
    private geolocate: Geolocation
  ) { 
    this.determinePosition();
  }

  private determinePosition() {
    this.platform.ready().then(() => {
      this.geolocate.getCurrentPosition({
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 60000
      }).then(res => {
        // const latitude = 50.863892;
        // const longitude = 4.6337528;
        // const latitude = 50 + Math.random();
        // const longitude = 4 + Math.random();
        // res = {
        //   coords: {
        //     latitude: latitude,
        //     longitude: longitude,
        //     accuracy: 0,
        //     altitude: 0,
        //     altitudeAccuracy: 0,
        //     heading: 0,
        //     speed: 0
        //   },
        //   timestamp: 1234
        // }
        this.onPositionUpdate.emit(res);
      }).catch((error) => console.log(JSON.stringify(error)));
    })
  }

}