import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
} from '@angular/core';

import { NavService } from '@app/core';


@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {

  constructor(
    private _navService: NavService,
  ) {}

  public ngOnInit(): void {
    this._navService.setTitle('');
  }

}
