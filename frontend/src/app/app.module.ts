// src/app/app.module.ts
import { NgModule }              from '@angular/core';
import { BrowserModule }         from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule }          from '@angular/common';
import { RouterModule }          from '@angular/router';

import { AppRoutingModule }      from './app-routing.module';
import { AppComponent }          from './app.component';

import { NavbarComponent }       from './components/navbar/navbar.component';
import { FooterComponent }       from './components/footer/footer.component';
import { HomeComponent }         from './components/home/home.component';
import { BlogPostComponent }     from './components/blog-post/blog-post.component';
import { AboutComponent }        from './components/about/about.component';
import { ContactComponent }      from './components/contact/contact.component';
import { LoginComponent }        from './components/login/login.component';
import { AdminComponent }        from './components/admin/admin.component';
import { CategoryComponent }     from './components/category/category.component';
import { LegalComponent }        from './components/legal/legal.component';
import { TagComponent }          from './components/tag/tag.component';

import { AuthInterceptor }       from './services/auth.interceptor';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ProfileComponent }       from './components/profile/profile.component';
import { RoleFilterPipe }        from './pipes/role-filter.pipe';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    HomeComponent,
    BlogPostComponent,
    AboutComponent,
    ContactComponent,
    LoginComponent,
    AdminComponent,
    CategoryComponent,
    LegalComponent,
    TagComponent,
    ResetPasswordComponent,
    ProfileComponent,
    RoleFilterPipe,
  ],
  imports: [
    BrowserModule,           // re-exports CommonModule (NgIf, NgFor, SlicePipe, AsyncPipe…)
    BrowserAnimationsModule,
    CommonModule,            // explicit — ensures SlicePipe & structural directives everywhere
    RouterModule,            // explicit — ensures routerLink works in every declared component
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}