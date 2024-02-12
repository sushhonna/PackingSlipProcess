import { Component, OnInit } from '@angular/core';
import { JobCompletionState } from 'src/app/shared/state/job-completion.state';

@Component({
  selector: 'app-jc-progress-bar',
  templateUrl: './jc-progress-bar.component.html',
  styleUrls: ['./jc-progress-bar.component.scss']
})
export class JcProgressBarComponent implements OnInit {
  isScanId = false;
  isPhotography = false;
  isEmployeeEntry = false;

  constructor(private jobCompletionState: JobCompletionState) { }

  ngOnInit() {
    switch (this.jobCompletionState.currentProgressStep) {
      case 1:
        this.isScanId = true;
        break;
      case 2:
        this.isPhotography = true;
        break;
      case 3:
        this.isEmployeeEntry = true;
        break;
    }
  }

}
