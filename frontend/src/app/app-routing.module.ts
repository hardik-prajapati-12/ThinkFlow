// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent }           from './components/home/home.component';
import { BlogPostComponent }       from './components/blog-post/blog-post.component';
import { AboutComponent }          from './components/about/about.component';
import { ContactComponent }        from './components/contact/contact.component';
import { LoginComponent }          from './components/login/login.component';
import { AdminComponent }          from './components/admin/admin.component';
import { CategoryComponent }       from './components/category/category.component';
import { LegalComponent }          from './components/legal/legal.component';
import { TagComponent }            from './components/tag/tag.component';
import { ResetPasswordComponent }  from './components/reset-password/reset-password.component';
import { ProfileComponent }         from './components/profile/profile.component';
import { AuthGuard }               from './guards/auth.guard';
import { AuthorGuard }             from './guards/author.guard';

const routes: Routes = [
  { path: 'tag/:tag',              component: TagComponent },           // ← MUST be before wildcard
  { path: '',                      component: HomeComponent },
  { path: 'blog/:slug',            component: BlogPostComponent },
  { path: 'about',                 component: AboutComponent },
  { path: 'contact',               component: ContactComponent },
  { path: 'login',                 component: LoginComponent },
  { path: 'profile',               component: ProfileComponent },
  { path: 'forgot-password',       component: ResetPasswordComponent },
  { path: 'category/:slug',        component: CategoryComponent },
  { path: 'legal',                 component: LegalComponent },
  { path: 'legal/:tab',            component: LegalComponent },
  { path: 'admin',                 component: AdminComponent, canActivate: [AuthGuard, AuthorGuard] },
  { path: '**',                    redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],   // removed scrollPositionRestoration
  exports: [RouterModule]
})
export class AppRoutingModule {}