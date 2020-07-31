import { Component } from '@angular/core';
import { FilteringService } from './services/filtering-service';
import { UserService } from './services/user-service';
import { switchMap, map, pluck, tap } from 'rxjs/operators';

const filterConfig: any = {
  postsPerPage: 6,
  paginationKeys: {
    limit: '_limit',
    offset: '_start'
  }
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [
    FilteringService,
    { provide: 'filterServiceConfig', useValue: filterConfig }
  ]
})
export class AppComponent {
  public posts = [];
  public userId: string = '';
  constructor(
    public filteringService: FilteringService,
    public userService: UserService
  ) {
    // watch for filter updates. Updates can triggered either by load more button or if an filter is added
    this.filteringService.onFilterUpdate$.pipe(
      tap((console.log)),
      switchMap((data: any) => this.userService.getUsers(data.filterString).pipe(
        map((response) => {
          return { response, trigger: data.trigger };
        }),
      )),
    ).subscribe((data: { response, trigger }) => {
      // if trigger was load more, add it to existing  posts, otherwise replace the posts with the response
      if (data.trigger === 'loadMore') {
        this.posts = [...this.posts, ...data.response];
      } else {
        this.posts = data.response;
      }
    });
  }

  public addFilter(): void {
    console.log('addddding');

    this.filteringService.addToFilter({ key: 'userId', value: this.userId });
  }
}
