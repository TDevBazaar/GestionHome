import { Injectable, signal, WritableSignal } from '@angular/core';
import { House } from '../models/house.model';
import { Expense, ExpenseStatus, Priority, RecurrenceFrequency } from '../models/expense.model';
import { Note } from '../models/note.model';
import { Currency } from '../models/currency.model';
import { User, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  isDataLoaded = signal(false);
  houses: WritableSignal<House[]> = signal([]);
  expenses: WritableSignal<Expense[]> = signal([]);
  notes: WritableSignal<Note[]> = signal([]);
  categories: WritableSignal<string[]> = signal([]);
  currencies: WritableSignal<Currency[]> = signal([]);
  users: WritableSignal<User[]> = signal([]);

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    // Simular carga de red asíncrona
    setTimeout(() => {
        const upcomingDueDate = new Date();
        upcomingDueDate.setDate(new Date().getDate() + 2); // Due in 2 days

        const initialHouses: House[] = [
        { id: 'h1', name: 'Residencia Principal', address: '123 Calle Principal, La Habana', currency: 'CUP', imageUrl: 'https://picsum.photos/seed/h1/400/200' },
        { id: 'h2', name: 'Cabaña de Vacaciones', address: '456 Camino del Lago, Varadero', currency: 'EUR', imageUrl: 'https://picsum.photos/seed/h2/400/200' },
        ];

        const initialCategories = ['Vivienda', 'Servicios', 'Impuestos', 'Alimentación', 'Transporte', 'Ocio', 'Salud', 'Educación', 'Suscripciones'];
        
        const initialCurrencies: Currency[] = [
            { code: 'CUP', name: 'Peso Cubano', symbol: '$MN', rateToCUP: 1 },
            { code: 'EUR', name: 'Euro', symbol: '€', rateToCUP: 25.92 },
            { code: 'USD', name: 'Dólar estadounidense', symbol: '$', rateToCUP: 24 },
        ];

        const initialExpenses: Expense[] = [
        { id: 'e1', houseId: 'h1', description: 'Alquiler Mensual', amount: 10000, currency: 'CUP', category: 'Vivienda', status: ExpenseStatus.Completed, dueDate: new Date('2024-07-01'), paidDate: new Date('2024-07-01'), priority: Priority.High, createdAt: new Date() },
        { id: 'e2', houseId: 'h1', description: 'Suscripción a Internet', amount: 1200, currency: 'CUP', category: 'Servicios', status: ExpenseStatus.Pending, dueDate: new Date('2024-07-15'), priority: Priority.Medium, createdAt: new Date(), isRecurring: true, recurrenceFrequency: RecurrenceFrequency.Monthly },
        { id: 'e3', houseId: 'h2', description: 'Impuesto a la Propiedad', amount: 800, currency: 'EUR', category: 'Impuestos', status: ExpenseStatus.Pending, dueDate: new Date('2024-08-01'), priority: Priority.High, createdAt: new Date() },
        { id: 'e4', houseId: 'h1', description: 'Compras', amount: 3000, currency: 'CUP', category: 'Alimentación', status: ExpenseStatus.Completed, paidDate: new Date('2024-07-05'), priority: Priority.Low, createdAt: new Date() },
        { id: 'e5', houseId: 'h1', description: 'Factura de Electricidad', amount: 1500, currency: 'CUP', category: 'Servicios', status: ExpenseStatus.Pending, dueDate: upcomingDueDate, priority: Priority.High, createdAt: new Date() }
        ];

        const initialNotes: Note[] = [
        { id: 'n1', houseId: 'h1', title: 'Contacto del Fontanero', content: 'Juan Pérez - 555-1234. Arregló el lavabo el 5 de junio.', author: 'Admin', createdAt: new Date(), isPinned: true },
        { id: 'n2', houseId: 'h2', title: 'Lista de Preparación para el Invierno', content: '- Drenar tuberías\n- Revisar aislamiento\n- Acumular leña', author: 'Admin', createdAt: new Date(), isPinned: false },
        ];
        
        const initialUsers: User[] = [
        { id: 'u1', username: 'admin', password: 'admin123', role: UserRole.Admin, assignedHouseIds: [] },
        { id: 'u2', username: 'user', password: 'user123', role: UserRole.User, assignedHouseIds: ['h1'] }
        ];

        this.houses.set(initialHouses);
        this.expenses.set(initialExpenses);
        this.notes.set(initialNotes);
        this.categories.set(initialCategories);
        this.currencies.set(initialCurrencies);
        this.users.set(initialUsers);
        this.isDataLoaded.set(true);
    }, 1500);
  }

  addExpense(expenseData: Omit<Expense, 'id' | 'createdAt' | 'houseId' | 'currency'>, houseId: string): Expense {
    const house = this.houses().find(h => h.id === houseId);
    if (!house) {
        console.error("House not found for adding expense");
        throw new Error("House not found");
    }

    const newExpense: Expense = {
      ...expenseData,
      id: crypto.randomUUID(),
      houseId: houseId,
      currency: house.currency,
      createdAt: new Date(),
    };

    if (newExpense.status === ExpenseStatus.Completed && !newExpense.paidDate) {
        newExpense.paidDate = new Date();
    }
    if (newExpense.status !== ExpenseStatus.Completed) {
        delete newExpense.paidDate;
    }

    this.expenses.update(expenses => [...expenses, newExpense]);
    return newExpense;
  }

  addNote(noteData: Omit<Note, 'id' | 'createdAt' | 'houseId'>, houseId: string): Note {
    const newNote: Note = {
      ...noteData,
      id: crypto.randomUUID(),
      houseId: houseId,
      createdAt: new Date(),
    };
    this.notes.update(notes => [...notes, newNote]);
    return newNote;
  }
  
  updateExpenseStatus(expenseId: string, status: ExpenseStatus): void {
      this.expenses.update(expenses => {
        let updatedExpenses = expenses.map(e => 
            e.id === expenseId 
            ? { ...e, status: status, paidDate: status === ExpenseStatus.Completed ? new Date() : undefined } 
            : e
        );

        if (status === ExpenseStatus.Completed) {
            const paidExpense = updatedExpenses.find(e => e.id === expenseId);
            if (paidExpense?.isRecurring && paidExpense.dueDate && paidExpense.recurrenceFrequency) {
                const nextDueDate = this.calculateNextDueDate(new Date(paidExpense.dueDate), paidExpense.recurrenceFrequency);
                const endDate = paidExpense.recurrenceEndDate ? new Date(paidExpense.recurrenceEndDate) : null;

                if (!endDate || nextDueDate <= endDate) {
                    const newRecurringExpense: Expense = {
                        ...paidExpense,
                        id: crypto.randomUUID(),
                        status: ExpenseStatus.Pending,
                        dueDate: nextDueDate,
                        paidDate: undefined,
                        createdAt: new Date(),
                    };
                    updatedExpenses = [...updatedExpenses, newRecurringExpense];
                }
            }
        }
        return updatedExpenses;
      });
  }

  updateExpense(updatedExpense: Expense): void {
    this.expenses.update(expenses =>
      expenses.map(e => (e.id === updatedExpense.id ? updatedExpense : e))
    );
  }

  deleteExpense(expenseId: string): void {
    this.expenses.update(expenses => expenses.filter(e => e.id !== expenseId));
  }

  deleteNote(noteId: string): void {
    this.notes.update(notes => notes.filter(n => n.id !== noteId));
  }
  
  togglePinNote(noteId: string): void {
    this.notes.update(notes => notes.map(n => 
      n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
    ));
  }

  // House Management
  addHouse(houseData: Omit<House, 'id'>): House {
    const newHouse: House = {
      ...houseData,
      id: crypto.randomUUID(),
    };
    if (!newHouse.imageUrl) {
        newHouse.imageUrl = `https://picsum.photos/seed/${newHouse.id}/400/200`;
    }
    this.houses.update(houses => [...houses, newHouse]);
    return newHouse;
  }
  
  updateHouse(updatedHouse: House): void {
      this.houses.update(houses => houses.map(h => h.id === updatedHouse.id ? updatedHouse : h));
  }

  deleteHouse(houseId: string): void {
    this.houses.update(houses => houses.filter(h => h.id !== houseId));
    this.expenses.update(expenses => expenses.filter(e => e.houseId !== houseId));
    this.notes.update(notes => notes.filter(n => n.houseId !== houseId));
    // Also remove house assignment from users
    this.users.update(users => users.map(u => ({
      ...u,
      assignedHouseIds: u.assignedHouseIds.filter(id => id !== houseId)
    })));
  }
  
  // User Management
  addUser(userData: Omit<User, 'id'>): User {
    const newUser: User = { ...userData, id: crypto.randomUUID() };
    this.users.update(users => [...users, newUser]);
    return newUser;
  }

  updateUser(updatedUser: User): void {
    this.users.update(users => users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
  }

  deleteUser(userId: string): void {
    this.users.update(users => users.filter(u => u.id !== userId));
  }

  // Category Management
  addCategory(name: string): void {
    this.categories.update(cats => [...cats, name].sort());
  }

  updateCategory(oldName: string, newName: string): void {
    // Update category in the master list
    this.categories.update(cats => {
      const index = cats.indexOf(oldName);
      if (index !== -1) {
        cats[index] = newName;
      }
      return [...cats.sort()];
    });

    // Update category in all associated expenses
    this.expenses.update(exps => exps.map(e => e.category === oldName ? { ...e, category: newName } : e));
  }

  deleteCategory(name: string): void {
    this.categories.update(cats => cats.filter(c => c !== name));
  }

  isCategoryInUse(name: string): boolean {
    return this.expenses().some(expense => expense.category === name);
  }

  // Currency Management
  addCurrency(currency: Currency): void {
    this.currencies.update(curr => [...curr, currency].sort((a, b) => a.code.localeCompare(b.code)));
  }

  updateCurrency(code: string, updatedCurrency: Currency): void {
    this.currencies.update(currencies => 
      currencies.map(c => c.code === code ? updatedCurrency : c)
    );
  }

  deleteCurrency(code: string): void {
    this.currencies.update(currencies => currencies.filter(c => c.code !== code));
  }

  isCurrencyInUse(code: string): boolean {
    return this.houses().some(house => house.currency === code);
  }

  private calculateNextDueDate(currentDueDate: Date, frequency: RecurrenceFrequency): Date {
      const nextDate = new Date(currentDueDate);
      const originalDay = currentDueDate.getDate();

      let monthsToAdd = 0;
      switch (frequency) {
          case RecurrenceFrequency.Monthly:
              monthsToAdd = 1;
              break;
          case RecurrenceFrequency.Quarterly:
              monthsToAdd = 3;
              break;
          case RecurrenceFrequency.Yearly:
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              // Check for leap year case, e.g., Feb 29 -> Feb 28
              if (nextDate.getDate() !== originalDay) {
                  nextDate.setDate(0); // Set to last day of previous month
              }
              return nextDate;
      }

      nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

      // Handle cases where the original day doesn't exist in the new month (e.g., Jan 31 -> Feb 28)
      if (nextDate.getDate() !== originalDay) {
          nextDate.setDate(0); // Sets date to the last day of the previous month
      }
      
      return nextDate;
  }
}