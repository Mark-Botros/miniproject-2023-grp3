import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import{ ProfileModule as PDA}from'@mp/app/profile/data-access';
import { IonicModule } from '@ionic/angular';
import { SearchPageRoutingModule } from './search.routing';

import { SearchPage } from './search.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SearchPageRoutingModule, PDA],
  declarations: [SearchPage],
})
export class SearchModule {}
