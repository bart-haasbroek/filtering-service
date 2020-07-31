import { Injectable } from '@angular/core';
import { scan, mapTo, startWith, debounceTime, map, withLatestFrom, tap } from 'rxjs/operators';
import { Subject, merge, combineLatest, BehaviorSubject } from 'rxjs';

export interface FilterInterface {
  key: string;
  value: string;
}

@Injectable()
export class FilterService {
  private onMoreButtonClick$: any = new Subject;
  private filterUpdater$: any = new Subject;
  private resetFilter$: any = new Subject;
  public onFilterUpdate$: any = new Subject;
  public currentFilter$: any = new BehaviorSubject(null);
  public postPerPage: number = 5;
  constructor() {
    this.handleFilterStatus();
  }


  // Public functions
  public addToFilter(key: string, value: string): void {
    this.filterUpdater$.next({
      key: key,
      value: value
    });
  }

  public setPostPerPage(postPerPage: number): void {
    this.postPerPage = postPerPage;
  }

  public addMore(): void {
    this.onMoreButtonClick$.next();
  }

  public resetFilters(filter?: FilterInterface | FilterInterface[]): void {
    const filterValues: FilterInterface | FilterInterface[] = filter ? filter : null;
    this.resetFilter$.next(filterValues);
  }

  public buildQueryString = (obj: any, baseUrl?: string) => {
    let queryString: string = '';
    let counter: number = 0;
    for (const key in obj) {
      const seperator: string = '&';
      const property: string = key;
      const value: string = obj[key];
      queryString += `${seperator}${property}=${value}`;
      counter++;
    }
    if (baseUrl) {
      queryString = baseUrl + queryString;
    }
    return queryString;
  }

  // private functions
  private handleFilterStatus(): void {

    // Get a string of what the trigger is.
    const trigger$ = merge(
      this.onMoreButtonClick$.pipe(mapTo('loadMore')),
      this.filterUpdater$.pipe(mapTo('filterUpdate')),
      this.resetFilter$.pipe(mapTo('filterReset')),
    );

    // the counter for increasing the offset of posts.
    // if an filter is added/removed reset the counter to 1 again
    const offsetCounter$ = trigger$.pipe(
      scan((curr: number, trigger: string) => {
        // only increase the offset when load more function is triggered
        return trigger === 'loadMore' ? curr + 1 : 0;
      }, 0),
    );

    // keep track of the limit and offset
    // based on the counter, increase the offset
    const offsetStatus$ = offsetCounter$.pipe(
      scan((prev: any, counter: number) => {
        return {
          limit: this.postPerPage,
          offset: this.postPerPage * counter
        };
      }, {
        limit: this.postPerPage,
        offset: 0,
      })
    );

    // Keep track of added filters.
    // When an filter is added, update the filters object with the UpdateFilters fuction
    const filter$ =
      merge(
        this.filterUpdater$,
        this.resetFilter$
      ).pipe(
        withLatestFrom(trigger$),
        map((filter: any) => {
          return {
            filterToAdd: filter[0],
            reset: filter[1] === 'filterReset'
          };
        }),
        scan((prev, curr: any) => {
          if (curr.reset) {
            return this.resetting(curr.filterToAdd);
          }
          return curr.filterToAdd ? this.updateFilters(prev, curr.filterToAdd.key, curr.filterToAdd.value, true, curr.reset) : {};
        }, {}),
        startWith({})
      );

    // When either the offsetStatus or the filter has an update, build the final object to emit to the parent component.
    // Since filterUpdater$ triggered also the offsetStatus for resetting the offset, we add an debounceTime for preventing double emits
    // this way only one value is emitted instead of two short after each other
    const onUpdate$ = combineLatest(
      offsetStatus$,
      filter$
    ).pipe(
      debounceTime(10),
      map((data) => {
        return {
          ...data[0],
          ...data[1]
        };
      }),
    );

    // subscribe to the update observable. This service is not used as singleton, so it does'nt need to unsubscribe.
    onUpdate$.pipe(
      withLatestFrom(trigger$)
    ).subscribe((data) => {
      this.currentFilter$.next(data[0]);
      this.onFilterUpdate$.next({
        filters: data[0],
        trigger: data[1],
        filtersAmount: Object.keys(data[0]).length - 2,
        filtersAmountWithOffset: Object.keys(data[0]),
        filterString: this.buildQueryString(data[0])
      });
    });
  }

  private resetting = (init?: any) => {
    let newFilters: any = {};
    if (init) {
      if (Array.isArray(init)) {
        newFilters = init.reduce((prev, curr) => {
          return {
            ...prev,
            [curr.key]: curr.value
          };
        }, {});
      } else {
        newFilters = {
          [init.key]: init.value
        };
      }
    }
    return newFilters;
  }

  private updateFilters = (currentObj: any, key: string, value: string, toggleSameValue?: boolean, reset?: boolean) => {
    const objectIsPreset: boolean = !!currentObj[key] && currentObj[key] === value;
    if (reset) {
      if (objectIsPreset) {
        return {};
      }
      currentObj = {};
    }

    let newObject: any;
    if (!value) {
      const { [key]: label, ...rest } = currentObj;
      newObject = rest;
    } else {
      // if toggleSameValue and key and value already exist in current obj. Remove it from obj.
      if (toggleSameValue && objectIsPreset) {
        const { [key]: label, ...rest } = currentObj;
        newObject = rest;
      } else {
        newObject = {
          ...currentObj,
          [key]: value,
        };
      }
    }

    return newObject;
  }
}