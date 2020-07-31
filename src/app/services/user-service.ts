import { Injectable } from '@angular/core';
import { scan, mapTo, startWith, debounceTime, map, withLatestFrom, tap } from 'rxjs/operators';
import { Subject, merge, combineLatest, BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class UserService {
  constructor(
    private http: HttpClient,
  ) { }

  public getUsers(queryString?: string): Observable<any> {
    console.log('queryString', queryString);

    let endpoint = 'posts';
    if (queryString) {
      endpoint += queryString;
    }
    return this.http.get('https://jsonplaceholder.typicode.com/' + endpoint);
  }
}