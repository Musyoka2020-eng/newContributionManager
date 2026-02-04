// View Manager Module
// Handles view switching and view-specific operations

const ViewManager = (function() {
    let state = {
        contributionsData: {},
        blacklistData: { blacklistedMembers: [] },
        currentYear: '',
        currentMonth: '',
        currentView: 'monthly',
        eventHandlers: null
    };

    return {
        // Initialize view manager with state
        init(stateObj) {
            state = stateObj;
        },

        // Handle view change
        handleViewChange(newView) {
            state.currentView = newView;
            const dom = DOMManager.getAll();

            // Update tab UI
            this.updateTabUI(newView);

            // Update UI based on view
            UIRenderer.showView(newView);

            // Update control states
            if (newView === 'monthly') {
                if (dom.monthSelect) dom.monthSelect.disabled = false;
                if (dom.createMonthBtn) dom.createMonthBtn.disabled = false;
            } else {
                if (dom.monthSelect) dom.monthSelect.disabled = true;
                if (dom.createMonthBtn) dom.createMonthBtn.disabled = true;
            }

            // Perform view-specific actions
            if (newView === 'reports') {
                const reportsDom = DOMManager.getReportsViewElements();
                // Update member select dropdown
                ReportsManager.updateMemberSelect(state.contributionsData, reportsDom.reportMemberSelect);
                // Trigger initial report type change to show/hide appropriate filters
                ReportsManager.handleReportTypeChange(reportsDom.reportTypeSelect, reportsDom.memberSelectGroup, reportsDom.statusFilterGroup);
            }

            // Update display
            this.updateDisplay().catch(error => {
                console.error('Error updating display:', error);
            });
        },

        // Update tab UI active states
        updateTabUI(activeView) {
            const tabButtons = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');

            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to current tab and content
            const activeTabBtn = document.querySelector(`[data-view="${activeView}"]`);
            const activeTabContent = document.getElementById(`${activeView}-view`);

            if (activeTabBtn) activeTabBtn.classList.add('active');
            if (activeTabContent) activeTabContent.classList.add('active');
        },

        // Update display based on current view
        async updateDisplay() {
            if (state.currentView === 'monthly') {
                UIRenderer.renderMonthlyView(
                    state.contributionsData,
                    state.currentYear,
                    state.currentMonth,
                    state.eventHandlers
                );
            } else if (state.currentView === 'yearly') {
                UIRenderer.renderYearlyView(state.contributionsData, state.currentYear);
            } else if (state.currentView === 'blacklist') {
                UIRenderer.renderBlacklistView(state.blacklistData, state.eventHandlers);
            } else if (state.currentView === 'budget') {
                // Render budget with data from appState
                const budgetDom = { budgetContent: document.getElementById('budget-content') };
                const totalIncome = BudgetManager.calculateBudgetFromIncome(state.contributionsData);
                BudgetManager.renderBudgetUI(budgetDom, state.budgetData, totalIncome);
                // Setup event handlers for budget
                setTimeout(() => {
                    EventHandlers.setupBudgetEventHandlers();
                }, 100);
            } else if (state.currentView === 'special-giving') {
                // Render special giving campaigns from appState
                const campaigns = SpecialGivingManager.getAllCampaigns(state.campaignsData);
                UIRenderer.renderSpecialGivingView(campaigns);
                // Setup event handlers for special giving
                setTimeout(() => {
                    EventHandlers.setupSpecialGivingEventHandlers();
                }, 100);
            }

            // Apply role restrictions after rendering
            UIRenderer.applyRoleRestrictions(AuthModule.getUserRole());
        },

        // Handle period change (year/month selection)
        handlePeriodChange(newYear, newMonth) {
            state.currentYear = newYear;
            state.currentMonth = newMonth;

            // Ensure year exists in data
            if (!state.contributionsData[newYear]) {
                state.contributionsData[newYear] = {};
            }

            this.updateDisplay().catch(error => {
                console.error('Error updating display:', error);
            });
        },

        // Handle create month
        handleCreateMonth(previousMonthData, monthExists, overwrite) {
            if (!state.contributionsData[state.currentYear]) {
                state.contributionsData[state.currentYear] = {};
            }

            let result = { newMembersAdded: 0 };

            if (monthExists && !overwrite) {
                result = ContributionsManager.addNewMembersToExistingMonth(
                    state.contributionsData[state.currentYear][state.currentMonth],
                    previousMonthData,
                    state.blacklistData
                );
                state.contributionsData[state.currentYear][state.currentMonth] = result.data;
            } else {
                state.contributionsData[state.currentYear][state.currentMonth] = 
                    ContributionsManager.createMonthDataFromPrevious(previousMonthData, state.blacklistData);
            }

            return result;
        },

        // Check and create current month if needed
        checkAndCreateCurrentMonth() {
            if (!state.contributionsData[state.currentYear]) {
                state.contributionsData[state.currentYear] = {};
            }

            if (!state.contributionsData[state.currentYear][state.currentMonth]) {
                const previousMonthData = ContributionsManager.findPreviousMonthData(
                    state.contributionsData,
                    state.currentYear,
                    state.currentMonth
                );
                state.contributionsData[state.currentYear][state.currentMonth] = 
                    ContributionsManager.createMonthDataFromPrevious(previousMonthData, state.blacklistData);
                return true; // Month was created
            }
            return false; // Month already exists
        },

        // Get current view
        getCurrentView() {
            return state.currentView;
        },

        // Generate report
        generateReport() {
            const dom = DOMManager.getReportsViewElements();
            
            const reportData = ReportsManager.generateReport(
                dom.reportTypeSelect,
                dom.reportMemberSelect,
                dom.reportStartMonth,
                dom.reportStartYear,
                dom.reportEndMonth,
                dom.reportEndYear,
                state.contributionsData,
                dom.statusFilter ? dom.statusFilter.value : 'all'
            );

            if (reportData) {
                ReportsManager.displayReport(
                    reportData,
                    dom.reportTitle,
                    dom.reportContent,
                    dom.reportOutput
                );
            }
        }
    };
})();
