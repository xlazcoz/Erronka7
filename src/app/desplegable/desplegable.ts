import { Component } from '@angular/core';
import { IgxButtonDirective, IgxToggleActionDirective } from 'igniteui-angular/directives';
import { IgxDropDownComponent, IgxDropDownItemComponent, IgxDropDownItemNavigationDirective } from 'igniteui-angular/drop-down';

@Component({
  imports: [IgxButtonDirective, IgxToggleActionDirective, IgxDropDownItemNavigationDirective, 
            IgxDropDownComponent, IgxDropDownItemComponent],
  selector: 'app-desplegable',
  styleUrl: './desplegable.css',
  templateUrl: './desplegable.html',
})
export class Desplegable {
  public items: { field: string }[] = [
        { field: 'Option 1' },
        { field: 'Option 2' },
        { field: 'Option 3' }
    ];
}
