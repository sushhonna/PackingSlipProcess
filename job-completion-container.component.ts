import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-job-completion-container',
  templateUrl: './job-completion-container.component.html',
  styleUrls: ['./job-completion-container.component.scss']
})
export class JobCompletionContainerComponent implements OnInit {
  constructor(router: Router) { }

  ngOnInit() { }
}
