import { Component, OnInit, Input } from '@angular/core';
import { JobCompletionState } from 'src/app/shared/state/job-completion.state';
import { Constants } from 'src/app/shared/constants';
import { Subscription } from 'rxjs';
import { Store } from 'src/app/shared/business-objects/store';
import { Endpoints } from 'src/app/shared/endpoints';
import { StoreDetails } from 'src/app/shared/business-objects/store-details';
import { JobV2 } from 'src/app/shared/business-objects/job-v2';
import { LoginState } from 'src/app/shared/state/login.state';
import { Image } from 'src/app/shared/business-objects/image';
import { EventService } from 'src/app/shared/services/event.service';

@Component({
  selector: 'app-jc-job-details',
  templateUrl: './jc-job-details.component.html',
  styleUrls: ['./jc-job-details.component.scss']
})
export class JcJobDetailsComponent implements OnInit {
  @Input("hideStoreDetails") hideStoreDetails: boolean;
  @Input("showImgsOnly") showImgsOnly: boolean;
  jobDetails: JobV2;
  storeDetails: StoreDetails;
  brandLogo = '';
  activeStore: Store;
  subscriptions: Subscription[] = [];
  shopNo: number;

  constructor(
    private jobCompletionState: JobCompletionState,
    private loginState: LoginState,
    private eventService: EventService
  ) { }

  ngOnInit() {
    let startTime = new Date();

    const newSubs: Subscription[] = [
      this.loginState.$dsc.subscribe(shopNo => this.shopNo = shopNo),
      this.jobCompletionState.$jobDetails.subscribe(() => {
        this.jobDetails = this.jobCompletionState.jobDetails$;
        if (this.jobDetails) {
          this.jobDetails.images.sort((a, b) => {
            return b.addDate - a.addDate;
          });
          this.activeStore = this.jobCompletionState.getActiveStore();
          this.brandLogo = this.getBrandLogo(this.activeStore);
          if (this.activeStore && this.hideStoreDetails === false && this.jobCompletionState.$assignedStores) {
            if (!this.jobCompletionState.isAssignedStore(this.activeStore.storeNo, this.activeStore.division)) {
              this.activeStore.ticketColor = '#000000';
            }
          }
        }
      }),
      this.jobCompletionState.$storeDetails.subscribe(() => {
        this.storeDetails = this.jobCompletionState.storeDetails$;
      })
    ];
    this.subscriptions.push(...newSubs);
    this.jobCompletionState.getAssignedStores(this.shopNo);

    let endTime = new Date();
    this.eventService.createPageLoadEvent('PAGE_LOAD_TIME', 'JC Job Details', startTime, endTime, null).subscribe();
  }

  getReceivingImages(): Image[] {
    return this.jobDetails.images.filter(image => image.imageTakenType && image.imageTakenType.toUpperCase() === 'R');
  }

  getBrandLogo(store: Store): string {
    let brandLogo: string = Endpoints.ZALES_LOGO;
    if (store.division === Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND) {
      if (store.brand.name.indexOf(Constants.BRAND_NAME.BRAND_LOGO.JARED_BRAND) !== -1) {
        brandLogo = Endpoints.JARED_LOGO;
      } else if (store.brand.name.indexOf(Constants.BRAND_NAME.BRAND_LOGO.KAY_BRAND) !== -1) {
        brandLogo = Endpoints.KAY_LOGO;
      } else {
        brandLogo = Endpoints.STERLING_LOGO;
      }
    }
    return brandLogo;
  }

  getImgUrl(imgId): string {
    return Endpoints.GET_IMAGE(imgId);
  }
}
