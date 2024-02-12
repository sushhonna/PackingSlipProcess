import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { JobV2 } from 'src/app/shared/business-objects/job-v2';
import { Store } from 'src/app/shared/business-objects/store';
import { StoreDetails } from 'src/app/shared/business-objects/store-details';
import { Constants } from 'src/app/shared/constants';
import { JobCompletionState } from 'src/app/shared/state/job-completion.state';
import { Subscription } from 'rxjs';
import { Image } from 'src/app/shared/business-objects/image';
import { Sort } from '@angular/material/sort';
import { ChainTag } from 'src/app/shared/business-objects/chain-tag';
import { LoginState } from 'src/app/shared/state/login.state';
import { EventService } from 'src/app/shared/services/event.service';

@Component({
  selector: 'app-scan-id',
  templateUrl: './scan-id.component.html',
  styleUrls: ['./scan-id.component.scss']
})
export class ScanIdComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput', { static: true }) searchInputField: ElementRef;
  jobDetails: JobV2;
  storeDetails: StoreDetails;
  brandLogo = '';
  activeStore: Store;
  subscriptions: Subscription[] = [];
  jobScanDetailsData: ChainTag[] = [];
  displayedColumns = ['actions', 'scanID'];
  isLoading: boolean;
  shopNo: number;
  enterMsg = Constants.DISPLAY_MESSAGES.JOBCOMPLETION.SCAN_ID;
  currentSortColumn = 'none';
  chainTagsNotScanned = false;
  chainTagsError =
    Constants.ERROR_MESSAGES.JOB_COMPLETION.CHAIN_TAGS_NOT_ENTERED;
  sortDirection = true;

  constructor(
    private jobCompletionState: JobCompletionState,
    private router: Router,
    private loginState: LoginState,
    private eventService: EventService
  ) {
    this.loginState.isLoading = true;
  }

  ngOnInit() {
    let startTime = new Date();
    this.searchInputField.nativeElement.focus();
    const newSubs: Subscription[] = [
      this.loginState.$dsc.subscribe(shopNo => (this.shopNo = shopNo)),
      this.loginState.$isLoading.subscribe(
        isLoading => (this.isLoading = isLoading)
      ),
      this.jobCompletionState.$jobDetails.subscribe(() => {
        this.jobDetails = this.jobCompletionState.jobDetails$;
        if (this.jobDetails) {
          this.jobScanDetailsData = this.jobDetails.chainTagNos;
          this.loginState.isLoading = false;
        }
      })
    ];
    this.subscriptions.push(...newSubs);
    let endTime = new Date();
    this.eventService.createPageLoadEvent('PAGE_LOAD_TIME', 'Scan ID', startTime, endTime, null).subscribe();
  }

  getBreadCrumbTitles(): string[] {
    return ['Job Completion', 'Scan Identification Tags'];
  }

  getBreadCrumbLinks(): string[] {
    return ['/job-completion/lookup'];
  }

  onSearch(event: KeyboardEvent): void {
    if ((event.target as HTMLInputElement).value.length >= 6) {
      this.jobScanDetailsData.forEach(scan => {
        if (
          (event.target as HTMLInputElement).value ===
          scan.chainTagNo.toString()
        ) {
          this.chainTagsNotScanned = false;
          scan.selected = true;
          (event.target as HTMLInputElement).value = '';
        }
      });
    }
  }

  deselectJob(scanDetails: ChainTag, $event: Event): void {
    this.jobScanDetailsData.forEach(scan => {
      if (scanDetails.chainTagNo === scan.chainTagNo) {
        scan.selected = false;
      }
    });
  }

  gotoPhotography(): void {
    const selected = this.jobScanDetailsData.filter(scan => scan.selected);
    if (selected.length === this.jobScanDetailsData.length) {
      this.chainTagsNotScanned = false;
      this.jobCompletionState.currentProgressStep = 2;
      this.router.navigateByUrl('/job-completion/lookup/photography');
    } else {
      this.chainTagsNotScanned = true;
    }
  }

  sortIndicator(source: string): string {
    if (source === this.currentSortColumn) {
      return 'z';
    } else {
      return 'T';
    }
  }

  sortTable(sort: Sort): number {
    const data = this.jobScanDetailsData.slice();
    if (!sort.active || sort.direction === '') {
      this.currentSortColumn = 'none';
      return;
    }

    this.jobScanDetailsData = data.sort((a, b) => {
      const ascending: boolean = sort.direction === 'asc';
      this.sortDirection = !!ascending;
      switch (sort.active) {
        case 'scanID':
          this.currentSortColumn = 'scanID';
          return this.compareToSort(a.chainTagNo, b.chainTagNo, ascending);
        default:
          return 0;
      }
    });
  }

  compareToSort(
    a: number | string | boolean | Date,
    b: number | string | boolean | Date,
    ascending: boolean
  ): number {
    return (a < b ? -1 : 1) * (ascending ? 1 : -1);
  }

  ngOnDestroy() {
    while (this.subscriptions.length > 0) {
      this.subscriptions.pop().unsubscribe();
    }
  }
}
