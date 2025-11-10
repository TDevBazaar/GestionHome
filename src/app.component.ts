import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, WritableSignal, Signal, effect, Injector } from '@angular/core';
import { CommonModule, NgOptimizedImage, TitleCasePipe } from '@angular/common';
import { DataService } from './services/data.service';
import { CurrencyService } from './services/currency.service';
import { AuthService } from './services/auth.service';
import { House } from './models/house.model';
import { Expense, ExpenseStatus, Priority } from './models/expense.model';
import { Note } from './models/note.model';
import { Currency } from './models/currency.model';
import { User, UserRole } from './models/user.model';
import { AppNotification } from './models/notification.model';
import * as d3 from 'd3';

// Component Imports
import { ExpenseFormComponent } from './components/expense-form.component';
import { NoteFormComponent } from './components/note-form.component';
import { ConfirmationDialogComponent } from './components/confirmation-dialog.component';
import { CategoryChartComponent, ChartData } from './components/category-chart.component';
import { LineChartComponent, LineChartData } from './components/line-chart.component';
import { DonutChartComponent, DonutChartData } from './components/donut-chart.component';
import { CategoryFormComponent } from './components/category-form.component';
import { CurrencyFormComponent } from './components/currency-form.component';
import { NotificationToastComponent } from './components/notification-toast.component';
import { HouseFormComponent } from './components/house-form.component';
import { LoginComponent } from './components/login.component';
import { UserFormComponent } from './components/user-form.component';

interface DisplayExpense extends Expense {
  displayAmount: number;
  displayCurrencyCode: string;
}

interface MonthlyBreakdown {
  month: string;
  total: number;
  count: number;
  topCategory: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [CommonModule, NgOptimizedImage, TitleCasePipe, ExpenseFormComponent, NoteFormComponent, ConfirmationDialogComponent, CategoryChartComponent, CategoryFormComponent, CurrencyFormComponent, NotificationToastComponent, HouseFormComponent, LineChartComponent, DonutChartComponent, LoginComponent, UserFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  dataService = inject(DataService);
  authService = inject(AuthService);
  currencyService = inject(CurrencyService);

  // App state
  selectedHouse: WritableSignal<House | null> = signal(null);
  displayCurrency: WritableSignal<Currency | null> = signal(null);
  isStateInitialized = signal(false);
  
  // UI State
  isExpenseFormVisible = signal(false);
  isNoteFormVisible = signal(false);
  isCategoryFormVisible = signal(false);
  isCurrencyFormVisible = signal(false);
  isHouseFormVisible = signal(false);
  isUserFormVisible = signal(false);
  expenseToEdit = signal<Expense | null>(null);
  categoryToEdit = signal<string | null>(null);
  currencyToEdit = signal<Currency | null>(null);
  houseToEdit = signal<House | null>(null);
  userToEdit = signal<User | null>(null);
  isSidebarOpen = signal(false);
  activeView: WritableSignal<string> = signal('dashboard');
  theme = signal<'light' | 'dark'>('light');
  currentDateDisplay: string = '';
  expenseViewMode = signal<'card' | 'list'>('card');
  loginError = signal<string | null>(null);
  
  // Pagination State
  itemsPerPage = computed(() => this.expenseViewMode() === 'card' ? 9 : 10);
  currentPage = signal(1);

  // Notification State
  notifications = signal<AppNotification[]>([]);
  snoozedExpenses = signal<Map<string, Date>>(new Map()); // <expenseId, snoozedUntil>
  notificationsEnabled = signal<boolean>(true);
  notificationDays = signal<number>(3);

  // Delete Confirmation Dialog State
  isConfirmationDialogVisible = signal(false);
  itemToDelete = signal<{ id: string; type: 'expense' | 'note' | 'category' | 'currency' | 'house' | 'user' } | null>(null);

  // Pay Confirmation Dialog State
  isPayConfirmationVisible = signal(false);
  expenseToPayId = signal<string | null>(null);

  // Filter State
  categoryFilter = signal<string>('all');
  statusFilter = signal<string>('all');
  dateFromFilter = signal<string | null>(null);
  dateToFilter = signal<string | null>(null);
  monthFilter = signal<string>('all');
  monthOptions: { value: string; label: string }[] = [];
  metricsTimeFilter = signal<'6m' | '1y' | 'all'>('6m');

  // Animation State
  newlyAddedItemIds = signal(new Set<string>());
  expensesToDelete = signal(new Set<string>());
  notesToDelete = signal(new Set<string>());
  housesToDelete = signal(new Set<string>());
  categoriesToDelete = signal(new Set<string>());
  currenciesToDelete = signal(new Set<string>());

  private readonly ANIMATION_DURATION_ENTER = 400;
  private readonly ANIMATION_DURATION_LEAVE = 300;

  // USER-AWARE COMPUTED SIGNALS
  users: Signal<User[]> = this.dataService.users;
  
  visibleHouses: Signal<House[]> = computed(() => {
    const allHouses = this.dataService.houses();
    const currentUser = this.authService.currentUser();
    if (!currentUser || currentUser.role === UserRole.Admin) {
      return allHouses;
    }
    const assignedIds = new Set(currentUser.assignedHouseIds);
    return allHouses.filter(h => assignedIds.has(h.id));
  });

  userVisibleExpenses: Signal<Expense[]> = computed(() => {
    const allExpenses = this.dataService.expenses();
    const user = this.authService.currentUser();
    if (!user || user.role === UserRole.Admin) {
      return allExpenses;
    }
    const assignedHouseIds = new Set(user.assignedHouseIds);
    return allExpenses.filter(e => assignedHouseIds.has(e.houseId));
  });

  // Computed Signals for Data Display
  pendingExpenses: Signal<Expense[]>;
  completedExpenses: Signal<Expense[]>;
  notesForSelectedHouse: Signal<Note[]>;
  pinnedNotesForSelectedHouse: Signal<Note[]>;
  expenseCategories: Signal<string[]> = this.dataService.categories;
  currencies: Signal<Currency[]> = this.dataService.currencies;
  filteredExpenses: Signal<DisplayExpense[]>;
  paginatedExpenses: Signal<DisplayExpense[]>;
  totalPages: Signal<number>;
  paginationSummary: Signal<string>;
  activeSubscriptions: Signal<DisplayExpense[]>;
  housesWithStats: Signal<{
    id: string;
    name: string;
    address: string;
    currency: string;
    imageUrl: string;
    pendingCount: number;
    pendingAmount: number;
  }[]>;

  // Computed signals for Dashboard Metrics
  totalPendingAmount: Signal<number>;
  pendingExpensesCount: Signal<number>;
  totalPaidThisMonth: Signal<number>;
  nextDueDate: Signal<Date | string | undefined>;
  expensesByCategory: Signal<ChartData[]>;
  totalThisMonth: Signal<number>;
  dueThisWeekCount: Signal<number>;

  // Computed signals for Metrics View
  spendingTrendData: Signal<LineChartData[]>;
  subscriptionSpendingTrendData: Signal<LineChartData[]>;
  categoryBreakdownData: Signal<DonutChartData[]>;
  spendingByHouseData: Signal<ChartData[]>;
  monthlyBreakdownData: Signal<MonthlyBreakdown[]>;
  hasSubscriptionSpendingData: Signal<boolean>;


  constructor(private injector: Injector) {
    const expenses = this.dataService.expenses;
    const notes = this.dataService.notes;

    const expensesForSelectedHouse = computed(() => {
        const house = this.selectedHouse();
        if (!house) return [];
        return expenses().filter(e => e.houseId === house.id);
    });

    this.pendingExpenses = computed(() => 
        expensesForSelectedHouse()
            .filter(e => e.status === ExpenseStatus.Pending)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    );

    this.completedExpenses = computed(() => 
        expensesForSelectedHouse()
            .filter(e => e.status === ExpenseStatus.Completed)
            .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())
    );

    this.notesForSelectedHouse = computed(() => {
        const house = this.selectedHouse();
        if (!house) return [];
        return notes()
            .filter(n => n.houseId === house.id)
            .sort((a, b) => {
                if (a.isPinned !== b.isPinned) {
                    return a.isPinned ? -1 : 1;
                }
                return b.createdAt.getTime() - a.createdAt.getTime();
            });
    });

    this.pinnedNotesForSelectedHouse = computed(() => {
        const house = this.selectedHouse();
        if (!house) return [];
        return notes()
            .filter(n => n.houseId === house.id && n.isPinned)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    });
    
    this.filteredExpenses = computed(() => {
      const category = this.categoryFilter();
      const status = this.statusFilter();
      const fromDate = this.dateFromFilter();
      const toDate = this.dateToFilter();
      const displayCurr = this.displayCurrency();
      
      if (!displayCurr) return [];

      let expenses = expensesForSelectedHouse();

      if (status !== 'all') {
        expenses = expenses.filter(e => e.status === status);
      }
      if (category !== 'all') {
        expenses = expenses.filter(e => e.category === category);
      }
      
      const from = fromDate ? new Date(fromDate) : null;
      if (from) from.setHours(0, 0, 0, 0);

      const to = toDate ? new Date(toDate) : null;
      if (to) to.setHours(23, 59, 59, 999);

      if (from || to) {
        expenses = expenses.filter(e => {
          const relevantDateStr = e.status === ExpenseStatus.Completed ? e.paidDate : e.dueDate;
          if (!relevantDateStr) return false;
          const relevantDate = new Date(relevantDateStr);
          const isAfterFrom = from ? relevantDate >= from : true;
          const isBeforeTo = to ? relevantDate <= to : true;
          return isAfterFrom && isBeforeTo;
        });
      }
      
      const sortedExpenses = expenses.sort((a, b) => {
          const dateAStr = a.status === ExpenseStatus.Completed ? a.paidDate : a.dueDate;
          const dateBStr = b.status === ExpenseStatus.Completed ? b.paidDate : b.dueDate;
          const dateA = dateAStr ? new Date(dateAStr).getTime() : 0;
          const dateB = dateBStr ? new Date(dateBStr).getTime() : 0;
          return dateB - dateA;
      });

      return sortedExpenses.map(expense => ({
        ...expense,
        displayAmount: this.currencyService.convert(expense.amount, expense.currency, displayCurr.code),
        displayCurrencyCode: displayCurr.code
      }));
    });

    this.totalPages = computed(() => {
        const totalItems = this.filteredExpenses().length;
        if (totalItems === 0) return 1;
        return Math.ceil(totalItems / this.itemsPerPage());
    });

    this.paginatedExpenses = computed(() => {
        const expenses = this.filteredExpenses();
        const page = this.currentPage();
        const perPage = this.itemsPerPage();
        const start = (page - 1) * perPage;
        const end = start + perPage;
        return expenses.slice(start, end);
    });

    this.paginationSummary = computed(() => {
        const total = this.filteredExpenses().length;
        if (total === 0) return 'Mostrando 0 de 0';
        const perPage = this.itemsPerPage();
        const page = this.currentPage();
        const start = (page - 1) * perPage + 1;
        const end = Math.min(page * perPage, total);
        return `Mostrando ${start} - ${end} de ${total}`;
    });

    this.activeSubscriptions = computed(() => {
      const displayCurr = this.displayCurrency();
      if (!displayCurr) return [];

      return this.userVisibleExpenses()
        .filter(e => e.isRecurring && e.status === ExpenseStatus.Pending)
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
        .map(expense => ({
          ...expense,
          displayAmount: this.currencyService.convert(expense.amount, expense.currency, displayCurr.code),
          displayCurrencyCode: displayCurr.code
        }));
    });

    // Dashboard Metrics Signals
    this.totalPendingAmount = computed(() => {
      const displayCurr = this.displayCurrency();
      if (!displayCurr) return 0;
      return this.pendingExpenses().reduce((sum, exp) => {
        const convertedAmount = this.currencyService.convert(exp.amount, exp.currency, displayCurr.code);
        return sum + convertedAmount;
      }, 0);
    });

    this.pendingExpensesCount = computed(() => this.pendingExpenses().length);

    this.totalPaidThisMonth = computed(() => {
      const displayCurr = this.displayCurrency();
      if (!displayCurr) return 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const paidThisMonth = this.completedExpenses()
        .filter(exp => {
          if (!exp.paidDate) return false;
          const paidDate = new Date(exp.paidDate);
          return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
        });
      
      return paidThisMonth.reduce((sum, exp) => {
        const convertedAmount = this.currencyService.convert(exp.amount, exp.currency, displayCurr.code);
        return sum + convertedAmount;
      }, 0);
    });

    this.nextDueDate = computed(() => {
      const sortedPending = this.pendingExpenses();
      return sortedPending.length > 0 ? sortedPending[0].dueDate : undefined;
    });

    this.expensesByCategory = computed(() => {
        const displayCurr = this.displayCurrency();
        if (!displayCurr) return [];
        const expenses = expensesForSelectedHouse();
        if (expenses.length === 0) return [];

        const categoryMap = new Map<string, number>();
        for (const expense of expenses) {
            const convertedAmount = this.currencyService.convert(expense.amount, expense.currency, displayCurr.code);
            const currentTotal = categoryMap.get(expense.category) || 0;
            categoryMap.set(expense.category, currentTotal + convertedAmount);
        }

        return Array.from(categoryMap, ([category, total]) => ({ category, total }))
                    .sort((a, b) => b.total - a.total);
    });

    this.housesWithStats = computed(() => {
        const displayCurr = this.displayCurrency();
        const houses = this.visibleHouses();
        const expenses = this.userVisibleExpenses();
        
        if (!displayCurr) {
            return houses.map(house => ({
                ...house,
                pendingCount: 0,
                pendingAmount: 0
            }));
        }

        return houses.map(house => {
            const houseExpenses = expenses.filter(e => e.houseId === house.id);
            const pendingExpenses = houseExpenses.filter(e => e.status === ExpenseStatus.Pending);
            
            const pendingAmountDisplay = pendingExpenses.reduce((sum, e) => {
              return sum + this.currencyService.convert(e.amount, e.currency, displayCurr.code);
            }, 0);

            return {
                ...house,
                pendingCount: pendingExpenses.length,
                pendingAmount: pendingAmountDisplay
            };
        });
    });

    this.totalThisMonth = computed(() => {
      const displayCurr = this.displayCurrency();
      if (!displayCurr) return 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const expensesInMonth = expensesForSelectedHouse().filter(exp => {
        const relevantDateStr = exp.status === ExpenseStatus.Completed ? exp.paidDate : exp.dueDate;
        if (!relevantDateStr) return false;
        const relevantDate = new Date(relevantDateStr);
        return relevantDate.getMonth() === currentMonth && relevantDate.getFullYear() === currentYear;
      });

      return expensesInMonth.reduce((sum, exp) => {
        const convertedAmount = this.currencyService.convert(exp.amount, exp.currency, displayCurr.code);
        return sum + convertedAmount;
      }, 0);
    });
    
    this.dueThisWeekCount = computed(() => {
        const now = new Date();
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(now.getDate() + 7);
        now.setHours(0,0,0,0);

        return this.pendingExpenses().filter(e => {
            if (!e.dueDate) return false;
            const dueDate = new Date(e.dueDate);
            return dueDate >= now && dueDate <= oneWeekFromNow;
        }).length;
    });

    // Metrics View Signals
    this.spendingTrendData = computed(() => {
        const displayCurr = this.displayCurrency();
        if (!displayCurr) return [];
        
        const paidExpenses = this.userVisibleExpenses().filter(e => e.status === ExpenseStatus.Completed && e.paidDate);
        const filtered = this.getFilteredExpensesByTime(paidExpenses, this.metricsTimeFilter());

        const monthlyTotals = d3.group(filtered, (d: Expense) => d3.timeMonth(new Date(d.paidDate!)));
        
        const chartData: LineChartData[] = Array.from(monthlyTotals, ([date, exps]) => ({
          date: date,
          value: d3.sum(exps, e => this.currencyService.convert(e.amount, e.currency, displayCurr.code))
        }));

        return chartData.sort((a,b) => a.date.getTime() - b.date.getTime());
    });

    this.subscriptionSpendingTrendData = computed(() => {
        const displayCurr = this.displayCurrency();
        if (!displayCurr) return [];

        const subscriptionExpenses = this.userVisibleExpenses().filter(e => 
          e.status === ExpenseStatus.Completed && 
          e.isRecurring &&
          e.paidDate &&
          new Date(e.paidDate).getFullYear() === new Date().getFullYear()
        );

        const monthlyTotals = d3.group(subscriptionExpenses, (d: Expense) => d3.timeMonth(new Date(d.paidDate!)));

        const chartData: LineChartData[] = Array.from(monthlyTotals, ([date, exps]) => ({
          date: date,
          value: d3.sum(exps, e => this.currencyService.convert(e.amount, e.currency, displayCurr.code))
        }));

        return chartData.sort((a,b) => a.date.getTime() - b.date.getTime());
    });

    this.hasSubscriptionSpendingData = computed(() => this.subscriptionSpendingTrendData().length > 0);

    this.categoryBreakdownData = computed(() => {
        const displayCurr = this.displayCurrency();
        if (!displayCurr) return [];

        const paidExpenses = this.userVisibleExpenses().filter(e => e.status === ExpenseStatus.Completed && e.paidDate);
        const filtered = this.getFilteredExpensesByTime(paidExpenses, this.metricsTimeFilter());
        
        const categoryMap = new Map<string, number>();
        for (const expense of filtered) {
            const convertedAmount = this.currencyService.convert(expense.amount, expense.currency, displayCurr.code);
            const currentTotal = categoryMap.get(expense.category) || 0;
            categoryMap.set(expense.category, currentTotal + convertedAmount);
        }

        return Array.from(categoryMap, ([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);
    });

    this.spendingByHouseData = computed(() => {
        const displayCurr = this.displayCurrency();
        if (!displayCurr) return [];

        const paidExpenses = this.userVisibleExpenses().filter(e => e.status === ExpenseStatus.Completed && e.paidDate);
        const filtered = this.getFilteredExpensesByTime(paidExpenses, this.metricsTimeFilter());

        const houseMap = new Map<string, number>();
        for (const expense of filtered) {
            const houseName = this.getHouseName(expense.houseId);
            const convertedAmount = this.currencyService.convert(expense.amount, expense.currency, displayCurr.code);
            const currentTotal = houseMap.get(houseName) || 0;
            houseMap.set(houseName, currentTotal + convertedAmount);
        }

        return Array.from(houseMap, ([category, total]) => ({ category, total }))
                     .sort((a, b) => b.total - a.total);
    });

    this.monthlyBreakdownData = computed(() => {
        const displayCurr = this.displayCurrency();
        if (!displayCurr) return [];
        
        const paidExpenses = this.userVisibleExpenses().filter(e => e.status === ExpenseStatus.Completed && e.paidDate);
        const filtered = this.getFilteredExpensesByTime(paidExpenses, this.metricsTimeFilter());

        const monthlyGroups = d3.group(filtered, (d: Expense) => d3.timeMonth.floor(new Date(d.paidDate!)));
        const sortedGroups = new Map([...monthlyGroups.entries()].sort((a, b) => b[0].getTime() - a[0].getTime()));

        const breakdown: MonthlyBreakdown[] = [];

        // FIX: Add explicit types to forEach callback to prevent type inference errors.
        sortedGroups.forEach((expenses: Expense[], monthDate: Date) => {
            const total = d3.sum(expenses, e => this.currencyService.convert(e.amount, e.currency, displayCurr.code));
            // FIX: Add explicit type to `categoryCounts` to help TypeScript's type inference.
            const categoryCounts: Map<string, number> = d3.rollup(expenses, v => v.length, d => d.category);
            const topCategory = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
            
            breakdown.push({
                month: this.capitalizeFirstLetter(monthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })),
                total,
                count: expenses.length,
                topCategory
            });
        });

        return breakdown;
    });
  }

  ngOnInit(): void {
    this.authService.autoLogin();
    
    effect(() => {
        if (this.dataService.isDataLoaded() && this.authService.isLoggedIn() && !this.isStateInitialized()) {
            const userHouses = this.visibleHouses();
            if (userHouses.length > 0) {
                const firstHouse = userHouses[0];
                this.selectedHouse.set(firstHouse);
                const houseCurrency = this.currencies().find(c => c.code === firstHouse.currency);
                this.displayCurrency.set(houseCurrency || this.currencies()[0] || null);
            } else if (this.currencies().length > 0) {
                const cupCurrency = this.currencies().find(c => c.code === 'CUP') || this.currencies()[0];
                this.displayCurrency.set(cupCurrency);
            }
            this.isStateInitialized.set(true);
        }
    }, { injector: this.injector });

    this.updateCurrentDate();
    setInterval(() => this.updateCurrentDate(), 60000);

    this.setupMonthFilterOptions();
    this.setupNotificationEffect();
  }

  // --- Event Handlers & Public Methods ---
  
  onLogin(credentials: { username: string, password: string }): void {
    const success = this.authService.login(credentials.username, credentials.password);
    if (!success) {
      this.loginError.set('Nombre de usuario o contraseña no válidos.');
    } else {
      this.loginError.set(null);
    }
  }

  logout(): void {
    this.authService.logout();
    this.isStateInitialized.set(false);
    this.selectedHouse.set(null);
    this.displayCurrency.set(null);
    this.activeView.set('dashboard');
  }
  
  toggleTheme(): void {
    this.theme.update(current => {
      const newTheme = current === 'light' ? 'dark' : 'light';
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newTheme;
    });
  }

  setActiveView(view: string): void {
    this.activeView.set(view);
    this.isSidebarOpen.set(false);
  }

  onHouseSelect(event: Event): void {
    const houseId = (event.target as HTMLSelectElement).value;
    const house = this.visibleHouses().find(h => h.id === houseId);
    this.selectedHouse.set(house || null);
  }

  onDisplayCurrencyChange(event: Event): void {
    const currencyCode = (event.target as HTMLSelectElement).value;
    const currency = this.currencies().find(c => c.code === currencyCode);
    this.displayCurrency.set(currency || null);
  }

  formatCompactCurrency(amount: number): string {
    const currency = this.displayCurrency();
    if (currency === null) return amount.toString();
    const formatter = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency.code,
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
    return formatter.format(amount);
  }

  // Form Openers
  openExpenseForm(expense: Expense | null = null): void {
    this.expenseToEdit.set(expense);
    this.isExpenseFormVisible.set(true);
  }
  
  openHouseForm(house: House | null = null): void {
    this.houseToEdit.set(house);
    this.isHouseFormVisible.set(true);
  }

  openUserForm(user: User | null = null): void {
    this.userToEdit.set(user);
    this.isUserFormVisible.set(true);
  }
  
  openCategoryForm(category: string | null = null): void {
    this.categoryToEdit.set(category);
    this.isCategoryFormVisible.set(true);
  }
  
  openCurrencyForm(currency: Currency | null = null): void {
    this.currencyToEdit.set(currency);
    this.isCurrencyFormVisible.set(true);
  }

  // Form Save Handlers
  onSaveExpense(expenseData: Omit<Expense, 'id' | 'createdAt' | 'houseId' | 'currency'> | Expense): void {
    if ('id' in expenseData) {
      this.dataService.updateExpense(expenseData);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Gasto actualizado correctamente.', type: 'success', isPersistent: false });
    } else {
      if (this.selectedHouse()) {
        const newExpense = this.dataService.addExpense(expenseData, this.selectedHouse()!.id);
        // FIX: Added missing isPersistent property
        this.addNotification({ message: 'Gasto añadido correctamente.', type: 'success', isPersistent: false });
        this.triggerItemAddAnimation(newExpense.id);
      }
    }
  }

  onSaveNote(noteData: Omit<Note, 'id' | 'createdAt' | 'houseId'>): void {
    if (this.selectedHouse()) {
      const newNote = this.dataService.addNote(noteData, this.selectedHouse()!.id);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Nota añadida correctamente.', type: 'success', isPersistent: false });
      this.triggerItemAddAnimation(newNote.id);
    }
  }
  
  onSaveHouse(houseData: Omit<House, 'id'> | House): void {
    if ('id' in houseData) {
      this.dataService.updateHouse(houseData);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Casa actualizada correctamente.', type: 'success', isPersistent: false });
    } else {
      const newHouse = this.dataService.addHouse(houseData);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Casa añadida correctamente.', type: 'success', isPersistent: false });
      this.triggerItemAddAnimation(newHouse.id);
    }
  }
  
  onSaveUser(userData: User): void {
    if (userData.id) {
      this.dataService.updateUser(userData);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Usuario actualizado correctamente.', type: 'success', isPersistent: false });
    } else {
      this.dataService.addUser(userData);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Usuario añadido correctamente.', type: 'success', isPersistent: false });
    }
  }

  onSaveCategory(data: { oldName?: string, newName: string }): void {
    if (data.oldName) {
      this.dataService.updateCategory(data.oldName, data.newName);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Categoría actualizada correctamente.', type: 'success', isPersistent: false });
    } else {
      this.dataService.addCategory(data.newName);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Categoría añadida correctamente.', type: 'success', isPersistent: false });
      this.triggerItemAddAnimation(data.newName);
    }
  }

  onSaveCurrency(currency: Currency): void {
    const existing = this.currencies().find(c => c.code === currency.code);
    if (existing) {
      this.dataService.updateCurrency(currency.code, currency);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Moneda actualizada correctamente.', type: 'success', isPersistent: false });
    } else {
      this.dataService.addCurrency(currency);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Moneda añadida correctamente.', type: 'success', isPersistent: false });
      this.triggerItemAddAnimation(currency.code);
    }
  }

  // Expense List Handlers
  onCategoryFilterChange(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onMonthFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.monthFilter.set(value);
    if (value === 'all') {
      this.resetDateFilters();
    } else {
      const [year, month] = value.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      this.dateFromFilter.set(this.formatDateForInput(startDate));
      this.dateToFilter.set(this.formatDateForInput(endDate));
    }
    this.currentPage.set(1);
  }

  onDateFilterChange(event: Event, type: 'from' | 'to'): void {
    const value = (event.target as HTMLInputElement).value;
    if (type === 'from') this.dateFromFilter.set(value);
    if (type === 'to') this.dateToFilter.set(value);
    this.monthFilter.set('all');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.categoryFilter.set('all');
    this.statusFilter.set('all');
    this.resetDateFilters();
    this.monthFilter.set('all');
    this.currentPage.set(1);
  }

  setExpenseViewMode(mode: 'card' | 'list'): void {
    this.expenseViewMode.set(mode);
    this.currentPage.set(1);
  }

  getPriorityClass(priority: Priority): string {
    const classes = {
      [Priority.High]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      [Priority.Medium]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      [Priority.Low]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return `px-2 py-0.5 text-xs font-semibold rounded-full ${classes[priority] || 'bg-gray-100 text-gray-800'}`;
  }
  
  previousPage(): void {
    this.currentPage.update(p => Math.max(1, p - 1));
  }
  
  nextPage(): void {
    this.currentPage.update(p => Math.min(this.totalPages(), p + 1));
  }
  
  onTogglePinNote(noteId: string): void {
    this.dataService.togglePinNote(noteId);
  }

  // Deletion Request Handlers
  requestDeleteExpense(id: string): void {
    this.itemToDelete.set({ id, type: 'expense' });
    this.isConfirmationDialogVisible.set(true);
  }

  requestDeleteNote(id: string): void {
    this.itemToDelete.set({ id, type: 'note' });
    this.isConfirmationDialogVisible.set(true);
  }
  
  requestDeleteHouse(id: string): void {
    this.itemToDelete.set({ id, type: 'house' });
    this.isConfirmationDialogVisible.set(true);
  }
  
  requestDeleteUser(id: string): void {
    this.itemToDelete.set({ id, type: 'user' });
    this.isConfirmationDialogVisible.set(true);
  }

  requestDeleteCategory(name: string): void {
    if (this.dataService.isCategoryInUse(name)) {
        // FIX: Added missing isPersistent property
        this.addNotification({ message: `La categoría "${name}" está en uso y no se puede eliminar.`, type: 'error', isPersistent: false });
        return;
    }
    this.itemToDelete.set({ id: name, type: 'category' });
    this.isConfirmationDialogVisible.set(true);
  }
  
  requestDeleteCurrency(code: string): void {
    if (this.dataService.isCurrencyInUse(code)) {
        // FIX: Added missing isPersistent property
        this.addNotification({ message: `La moneda "${code}" está en uso y no se puede eliminar.`, type: 'error', isPersistent: false });
        return;
    }
    this.itemToDelete.set({ id: code, type: 'currency' });
    this.isConfirmationDialogVisible.set(true);
  }
  
  requestMarkAsCompleted(expenseId: string): void {
    this.expenseToPayId.set(expenseId);
    this.isPayConfirmationVisible.set(true);
  }

  // Confirmation Dialog Handlers
  getConfirmationTitle(): string {
    const item = this.itemToDelete();
    if (!item) return '';
    const titles = { expense: 'Eliminar Gasto', note: 'Eliminar Nota', house: 'Eliminar Casa', user: 'Eliminar Usuario', category: 'Eliminar Categoría', currency: 'Eliminar Moneda' };
    return titles[item.type] || 'Confirmar Eliminación';
  }

  getConfirmationMessage(): string {
    const item = this.itemToDelete();
    if (!item) return '';
    const messages = {
      expense: '¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer.',
      note: '¿Estás seguro de que quieres eliminar esta nota?',
      house: '¿Estás seguro? Todos los gastos y notas asociados también se eliminarán.',
      user: '¿Estás seguro de que quieres eliminar este usuario?',
      category: '¿Estás seguro de que quieres eliminar esta categoría?',
      currency: '¿Estás seguro de que quieres eliminar esta moneda?',
    };
    return messages[item.type] || '¿Estás seguro?';
  }

  onConfirmDelete(): void {
    const item = this.itemToDelete();
    if (item) {
      const deleteActions = {
        expense: () => this.triggerItemLeaveAnimation(item.id, () => this.dataService.deleteExpense(item.id), 'expense'),
        note: () => this.triggerItemLeaveAnimation(item.id, () => this.dataService.deleteNote(item.id), 'note'),
        house: () => {
          this.triggerItemLeaveAnimation(item.id, () => this.dataService.deleteHouse(item.id), 'house');
          if (this.selectedHouse()?.id === item.id) {
              this.selectedHouse.set(this.visibleHouses()[0] || null);
          }
        },
        user: () => this.dataService.deleteUser(item.id),
        category: () => this.triggerItemLeaveAnimation(item.id, () => this.dataService.deleteCategory(item.id), 'category'),
        currency: () => this.triggerItemLeaveAnimation(item.id, () => this.dataService.deleteCurrency(item.id), 'currency'),
      };
      deleteActions[item.type]();
      // FIX: Added missing isPersistent property
      this.addNotification({ message: `${this.capitalizeFirstLetter(item.type)} eliminado correctamente.`, type: 'success', isPersistent: false });
    }
    this.onCancelDelete();
  }

  onCancelDelete(): void {
    this.isConfirmationDialogVisible.set(false);
    this.itemToDelete.set(null);
  }

  onConfirmPay(): void {
    const expenseId = this.expenseToPayId();
    if (expenseId) {
      this.dataService.updateExpenseStatus(expenseId, ExpenseStatus.Completed);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Gasto marcado como pagado.', type: 'success', isPersistent: false });
    }
    this.onCancelPay();
  }

  onCancelPay(): void {
    this.isPayConfirmationVisible.set(false);
    this.expenseToPayId.set(null);
  }
  
  // Other Public Methods
  getAssignedHouseNames(user: User): string {
    if (!user.assignedHouseIds?.length) return 'Ninguna';
    return user.assignedHouseIds.map(id => this.getHouseName(id)).join(', ');
  }

  getHouseName(houseId: string): string {
    return this.dataService.houses().find(h => h.id === houseId)?.name || 'Desconocida';
  }

  onMetricsTimeFilterChange(event: Event): void {
    this.metricsTimeFilter.set((event.target as HTMLSelectElement).value as '6m' | '1y' | 'all');
  }

  // Notifications
  addNotification(notification: Omit<AppNotification, 'id'> & { id?: string }): void {
    const id = notification.id || crypto.randomUUID();
    const newNotification: AppNotification = { ...notification, id, isPersistent: notification.isPersistent || false };
    if (this.notifications().some(n => n.id === id)) return;
    this.notifications.update(current => [...current, newNotification]);
    if (!newNotification.isPersistent) {
      setTimeout(() => this.dismissNotification(id), newNotification.duration || 5000);
    }
  }

  dismissNotification(id: string): void {
    this.notifications.update(current => current.filter(n => n.id !== id));
  }
  
  handleNotificationAction(event: { actionId: string, notificationId: string, context: any }): void {
    if (event.actionId === 'snooze' && event.context.expenseId) {
      const snoozedUntil = new Date();
      snoozedUntil.setDate(snoozedUntil.getDate() + 1);
      this.snoozedExpenses.update(current => new Map(current).set(event.context.expenseId, snoozedUntil));
      this.dismissNotification(event.notificationId);
      // FIX: Added missing isPersistent property
      this.addNotification({ message: 'Recordatorio pospuesto por un día.', type: 'info', isPersistent: false });
    } else if (event.actionId === 'pay' && event.context.expenseId) {
      this.requestMarkAsCompleted(event.context.expenseId);
      this.dismissNotification(event.notificationId);
    }
  }

  toggleNotificationsEnabled(): void {
    this.notificationsEnabled.update(e => !e);
  }

  updateNotificationDays(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value >= 1 && value <= 30) {
      this.notificationDays.set(value);
    }
  }
  
  // --- Private Helper Methods ---
  
  private resetDateFilters(): void {
    this.dateFromFilter.set(null);
    this.dateToFilter.set(null);
    // Find the date input elements and clear them
    const fromInput = document.querySelector('input[type="date"][data-filter="from"]') as HTMLInputElement;
    const toInput = document.querySelector('input[type="date"][data-filter="to"]') as HTMLInputElement;
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  private updateCurrentDate(): void {
    this.currentDateDisplay = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  
  private setupMonthFilterOptions(): void {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = date.toLocaleString('es-ES', { month: 'long' });
        const year = date.getFullYear();
        options.push({
            value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: `${this.capitalizeFirstLetter(monthName)} ${year}`
        });
    }
    this.monthOptions = options;
  }
  
  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  private setupNotificationEffect(): void {
      effect(() => {
        if (!this.notificationsEnabled()) return;
        const now = new Date();
        const upcomingDueDateLimit = new Date();
        upcomingDueDateLimit.setDate(now.getDate() + this.notificationDays());
        
        const upcomingExpenses = this.userVisibleExpenses().filter(e => {
            const snoozedUntil = this.snoozedExpenses().get(e.id);
            return e.status === ExpenseStatus.Pending && e.dueDate &&
                   new Date(e.dueDate) <= upcomingDueDateLimit &&
                   new Date(e.dueDate) >= now &&
                   (!snoozedUntil || now > snoozedUntil);
        });
        
        const upcomingExpenseIds = new Set(upcomingExpenses.map(e => `due-${e.id}`));
        this.notifications.update(current => current.filter(n => !n.id.startsWith('due-') || upcomingExpenseIds.has(n.id)));

        upcomingExpenses.forEach(expense => this.addNotification({
            id: `due-${expense.id}`,
            message: `Gasto "${expense.description}" vence pronto.`,
            type: 'warning',
            isPersistent: true,
            actions: [{ id: 'snooze', label: 'Posponer' }, { id: 'pay', label: 'Pagar' }],
            context: { expenseId: expense.id }
        }));
      }, { injector: this.injector });
  }

  private triggerItemAddAnimation(id: string): void {
    this.newlyAddedItemIds.update(ids => new Set(ids).add(id));
    setTimeout(() => {
      this.newlyAddedItemIds.update(ids => {
        const newIds = new Set(ids);
        newIds.delete(id);
        return newIds;
      });
    }, this.ANIMATION_DURATION_ENTER);
  }

  private triggerItemLeaveAnimation(id: string, deleteCallback: () => void, type: 'expense' | 'note' | 'house' | 'category' | 'currency'): void {
    const signal = this.getDeleteSignalForType(type);
    signal.update(ids => new Set(ids).add(id));
    setTimeout(() => {
      deleteCallback();
      signal.update(ids => {
        const newIds = new Set(ids);
        newIds.delete(id);
        return newIds;
      });
    }, this.ANIMATION_DURATION_LEAVE);
  }

  private getDeleteSignalForType(type: 'expense' | 'note' | 'house' | 'category' | 'currency'): WritableSignal<Set<string>> {
      const signalMap = {
        expense: this.expensesToDelete,
        note: this.notesToDelete,
        house: this.housesToDelete,
        category: this.categoriesToDelete,
        currency: this.currenciesToDelete
      };
      return signalMap[type];
  }

  private getFilteredExpensesByTime(expenses: Expense[], timeFilter: '6m' | '1y' | 'all'): Expense[] {
    const now = new Date();
    if (timeFilter === 'all') return expenses;

    const monthsToSubtract = timeFilter === '6m' ? 6 : 12;
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsToSubtract, 1);
    
    return expenses.filter(e => e.paidDate && new Date(e.paidDate) >= startDate);
  }
}