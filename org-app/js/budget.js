// Budget Management Module
// Handles budget tracking, expense management, and budget calculations
// Budget is automatically based on total income (contributions)
// NOTE: This module is purely business logic - all data is passed in and returned

const BudgetManager = (function() {
    // Module state for UI operations
    let currentBudgetData = {};

    return {
        // Initialize budget manager (no-op for now, kept for compatibility)
        init(userUID) {
            return Promise.resolve(true);
        },

        // Set current budget data (used by UI methods like applyExpenseFilter)
        _setCurrentBudgetData(budgetData) {
            currentBudgetData = budgetData;
        },

        // Calculate budget based on total PAID contributions only
        calculateBudgetFromIncome(contributionsData) {
            let totalPaid = 0;

            for (const year in contributionsData) {
                if (!Object.prototype.hasOwnProperty.call(contributionsData, year)) continue;
                
                const yearData = contributionsData[year];
                for (const month in yearData) {
                    if (!Object.prototype.hasOwnProperty.call(yearData, month)) continue;
                    
                    const monthData = yearData[month];
                    if (monthData.contributions) {
                        monthData.contributions.forEach(contribution => {
                            // Only count PAID contributions
                            if (contribution.paid) {
                                totalPaid += Number(contribution.amount) || 0;
                            }
                        });
                    }
                }
            }

            return totalPaid;
        },

        // Add new expense with date
        async addExpense(budgetData, amount, category, date = null, description = '') {
            try {
                const expenseId = Date.now().toString();
                const expenseDate = date ? new Date(date).getTime() : Date.now();
                
                const expense = {
                    amount: Number(amount),
                    category: category,
                    date: expenseDate,
                    description: description
                };

                if (!budgetData.expenses) {
                    budgetData.expenses = {};
                }

                budgetData.expenses[expenseId] = expense;
                
                return expenseId;
            } catch (error) {
                console.error('Error adding expense:', error);
                return null;
            }
        },

        // Remove expense
        async removeExpense(budgetData, expenseId) {
            try {
                if (!budgetData.expenses || !budgetData.expenses[expenseId]) {
                    throw new Error('Expense not found');
                }

                delete budgetData.expenses[expenseId];
                
                return true;
            } catch (error) {
                console.error('Error removing expense:', error);
                return false;
            }
        },

        // Get expense by ID
        getExpenseById(budgetData, expenseId) {
            return budgetData.expenses && budgetData.expenses[expenseId] ? budgetData.expenses[expenseId] : null;
        },

        // Update expense
        async updateExpense(budgetData, expenseId, amount, category, date, description) {
            try {
                if (!budgetData.expenses || !budgetData.expenses[expenseId]) {
                    throw new Error('Expense not found');
                }

                const expenseDate = date ? new Date(date).getTime() : Date.now();
                
                const updatedExpense = {
                    amount: Number(amount),
                    category: category,
                    date: expenseDate,
                    description: description
                };

                budgetData.expenses[expenseId] = updatedExpense;
                
                return true;
            } catch (error) {
                console.error('Error updating expense:', error);
                return false;
            }
        },

        // Calculate remaining budget (income - expenses)
        calculateRemaining(totalIncome, budgetData) {
            const totalExpenses = this.getTotalExpenses(budgetData);
            return totalIncome - totalExpenses;
        },

        // Get total expenses (all-time, not just current month)
        getTotalExpenses(budgetData) {
            let total = 0;
            if (!budgetData.expenses) return total;
            
            for (const expenseId in budgetData.expenses) {
                if (!Object.prototype.hasOwnProperty.call(budgetData.expenses, expenseId)) continue;
                
                const expense = budgetData.expenses[expenseId];
                total += Number(expense.amount);
            }
            return total;
        },

        // Get all expenses
        getAllExpenses(budgetData) {
            const expenses = [];
            if (!budgetData.expenses) return expenses;
            
            for (const expenseId in budgetData.expenses) {
                if (!Object.prototype.hasOwnProperty.call(budgetData.expenses, expenseId)) continue;
                
                const expense = budgetData.expenses[expenseId];
                expenses.push({
                    id: expenseId,
                    amount: expense.amount,
                    category: expense.category,
                    date: expense.date,
                    description: expense.description,
                    formattedDate: moment(expense.date).format('DD/MM/YYYY')
                });
            }
            return expenses.sort((a, b) => b.date - a.date);
        },

        // Get expenses in date range
        getExpensesByDateRange(budgetData, startDate, endDate) {
            const start = moment(startDate).startOf('day').valueOf();
            const end = moment(endDate).endOf('day').valueOf();
            
            return this.getAllExpenses(budgetData).filter(expense => {
                return expense.date >= start && expense.date <= end;
            });
        },

        // Get expenses by month and year
        getExpensesByMonth(budgetData, monthName, year) {
            const targetMonth = moment(monthName, 'MMMM').format('MMMM');
            const targetYear = year.toString();
            
            return this.getAllExpenses(budgetData).filter(expense => {
                const expenseDate = moment(expense.date);
                return expenseDate.format('MMMM') === targetMonth && 
                       expenseDate.format('YYYY') === targetYear;
            });
        },

        // Get expenses by category
        getExpensesByCategory(budgetData) {
            const categories = {};
            const currentMonth = moment().format('MMMM');
            const currentYear = moment().format('YYYY');

            if (!budgetData.expenses) return categories;

            for (const expenseId in budgetData.expenses) {
                if (!Object.prototype.hasOwnProperty.call(budgetData.expenses, expenseId)) continue;
                
                const expense = budgetData.expenses[expenseId];
                const expenseDate = moment(expense.date);
                
                if (expenseDate.format('MMMM') === currentMonth && 
                    expenseDate.format('YYYY') === currentYear) {
                    if (!categories[expense.category]) {
                        categories[expense.category] = 0;
                    }
                    categories[expense.category] += Number(expense.amount);
                }
            }

            return categories;
        },

        // Get current month expenses
        getCurrentMonthExpenses(budgetData) {
            const expenses = [];
            const currentMonth = moment().format('MMMM');
            const currentYear = moment().format('YYYY');

            if (!budgetData.expenses) return expenses;

            for (const expenseId in budgetData.expenses) {
                if (!Object.prototype.hasOwnProperty.call(budgetData.expenses, expenseId)) continue;
                
                const expense = budgetData.expenses[expenseId];
                const expenseDate = moment(expense.date);
                
                if (expenseDate.format('MMMM') === currentMonth && 
                    expenseDate.format('YYYY') === currentYear) {
                    expenses.push({
                        id: expenseId,
                        ...expense,
                        formattedDate: expenseDate.format('DD MMM YYYY')
                    });
                }
            }

            return expenses.sort((a, b) => b.date - a.date);
        },

        // Get budget data (for summary cards showing current month data)
        getBudgetData(budgetData, totalIncome) {
            const totalExpenses = this.getTotalExpenses(budgetData);
            const remaining = this.calculateRemaining(totalIncome, budgetData);
            
            return {
                totalIncome: totalIncome,
                totalExpenses: totalExpenses,
                remaining: remaining,
                expenses: this.getCurrentMonthExpenses(budgetData),
                categorized: this.getExpensesByCategory(budgetData)
            };
        },

        // Render budget UI
        renderBudgetUI(dom, budgetData, totalIncome, eventHandlers = {}) {
            if (!dom) {
                dom = { budgetContent: DOMManager.get('budgetContent') };
            }
            
            if (!dom || !dom.budgetContent) {
                console.warn('Budget DOM elements not found');
                return;
            }

            // Store current budget data for UI methods
            this._setCurrentBudgetData(budgetData);

            const data = this.getBudgetData(budgetData, totalIncome);
            const allExpenses = this.getAllExpenses(budgetData);
            const percentageUsed = totalIncome > 0 
                ? Math.min((data.totalExpenses / totalIncome) * 100, 100)
                : 0;

            // Render using template
            const html = Templates.BUDGET_UI(totalIncome, data, percentageUsed, allExpenses);
            dom.budgetContent.innerHTML = html;

            // Setup filter event listeners
            this.setupFilterListeners();
            
            // Apply initial filter to show correct expenses
            this.applyExpenseFilter();
        },

        // Setup expense filter listeners
        setupFilterListeners() {
            const filterType = document.getElementById('filter-type');
            const filterCategory = document.getElementById('filter-category');
            const filterStartDate = document.getElementById('filter-start-date');
            const filterEndDate = document.getElementById('filter-end-date');
            const dateRangeFilters = document.getElementById('date-range-filters');
            const applyDateFilter = document.getElementById('apply-date-filter');

            if (filterType) {
                filterType.addEventListener('change', (e) => {
                    if (e.target.value === 'date-range') {
                        dateRangeFilters.style.display = 'flex';
                    } else {
                        dateRangeFilters.style.display = 'none';
                        this.applyExpenseFilter();
                    }
                });
            }

            if (applyDateFilter) {
                applyDateFilter.addEventListener('click', () => {
                    this.applyExpenseFilter();
                });
            }

            if (filterCategory) {
                filterCategory.addEventListener('change', () => {
                    this.applyExpenseFilter();
                });
            }
        },

        // Apply expense filters
        applyExpenseFilter() {
            const filterType = document.getElementById('filter-type');
            const filterCategory = document.getElementById('filter-category');
            const filterStartDate = document.getElementById('filter-start-date');
            const filterEndDate = document.getElementById('filter-end-date');
            const expensesTbody = document.getElementById('expenses-tbody');
            
            const filterTypeVal = filterType?.value || 'all';
            const filterCategoryVal = filterCategory?.value || '';
            const filterStartDateVal = filterStartDate?.value;
            const filterEndDateVal = filterEndDate?.value;
            const expenseRows = document.querySelectorAll('.expense-row');

            let filteredExpenses = this.getAllExpenses(currentBudgetData);

            // Apply date filter
            if (filterTypeVal === 'current-month') {
                const currentMonth = moment().format('MMMM');
                const currentYear = moment().format('YYYY');
                filteredExpenses = filteredExpenses.filter(expense => {
                    const expenseDate = moment(expense.date);
                    return expenseDate.format('MMMM') === currentMonth && 
                           expenseDate.format('YYYY') === currentYear;
                });
            } else if (filterTypeVal === 'current-year') {
                const currentYear = moment().format('YYYY');
                filteredExpenses = filteredExpenses.filter(expense => {
                    return moment(expense.date).format('YYYY') === currentYear;
                });
            } else if (filterTypeVal === 'date-range' && filterStartDateVal && filterEndDateVal) {
                filteredExpenses = this.getExpensesByDateRange(currentBudgetData, filterStartDateVal, filterEndDateVal);
            }

            // Apply category filter
            if (filterCategoryVal) {
                filteredExpenses = filteredExpenses.filter(expense => expense.category === filterCategoryVal);
            }

            // Show/hide rows based on filtered results
            const filteredIds = new Set(filteredExpenses.map(e => e.id));
            let visibleCount = 0;
            
            expenseRows.forEach(row => {
                const expenseId = row.querySelector('.delete-expense')?.getAttribute('data-expense-id');
                if (filteredIds.has(expenseId)) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            // Show/hide "no data" message
            let noDataMsg = document.getElementById('no-data-message');
            if (visibleCount === 0) {
                if (!noDataMsg && expensesTbody) {
                    noDataMsg = document.createElement('tr');
                    noDataMsg.id = 'no-data-message';
                    noDataMsg.innerHTML = `<td colspan="5" class="no-data-cell">
                        <div class="no-expenses-message">
                            <i class="fas fa-inbox"></i>
                            <p>No expenses found for the selected filters</p>
                        </div>
                    </td>`;
                    expensesTbody.appendChild(noDataMsg);
                }
            } else {
                if (noDataMsg) {
                    noDataMsg.remove();
                }
            }
        },

        // Get budget data for export
        getBudgetDataForExport() {
            return budgetData;
        }
    };
})();