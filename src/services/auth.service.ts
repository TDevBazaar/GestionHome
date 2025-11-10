import { Injectable, signal, computed, inject } from '@angular/core';
import { DataService } from './data.service';
import { User, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private dataService = inject(DataService);
  
  currentUser = signal<User | null>(null);

  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === UserRole.Admin);

  login(username: string, password: string): boolean {
    const user = this.dataService.users().find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user && user.password === password) {
      const { password: _, ...userToStore } = user;
      this.currentUser.set(userToStore);
      sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
      return true;
    }
    
    this.logout();
    return false;
  }

  logout(): void {
    this.currentUser.set(null);
    sessionStorage.removeItem('currentUser');
  }

  autoLogin(): void {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user: User = JSON.parse(storedUser);
        // Quick validation to ensure it's a valid user object from our system
        if (user && user.id && user.username && user.role) {
          this.currentUser.set(user);
        } else {
          this.logout();
        }
      } catch (e) {
        console.error('Failed to parse stored user', e);
        this.logout();
      }
    }
  }
}
