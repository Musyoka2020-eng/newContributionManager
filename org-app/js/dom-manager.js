// DOM Manager Module
// Centralized DOM element references and caching

const DOMManager = (function() {
    let elements = {};

    function initializeElements() {
        elements = {
            // Main containers
            mainContainer: document.querySelector('main'),
            
            // Navigation and selectors
            yearSelect: document.getElementById('year-select'),
            monthSelect: document.getElementById('month-select'),
            viewTypeSelect: document.getElementById('view-type'),
            createMonthBtn: document.getElementById('create-month-btn'),
            
            // Contribution form elements
            contributionForm: document.getElementById('contribution-form'),
            contributionSection: document.querySelector('.add-contribution'),
            memberNameInput: document.getElementById('member-name'),
            contributionAmountInput: document.getElementById('contribution-amount'),
            contributionPaidInput: document.getElementById('contribution-paid'),
            
            // Monthly view elements
            contributionsList: document.getElementById('contributions-list'),
            totalAmountPaidDisplay: document.getElementById('total-amount-paid'),
            totalAmountUnpaidDisplay: document.getElementById('total-amount-unpaid'),
            currentMonthDisplay: document.getElementById('current-month-display'),
            currentYearDisplay: document.getElementById('current-year-display'),
            monthlyView: document.getElementById('monthly-view'),
            
            // Yearly view elements
            yearlyDisplay: document.getElementById('yearly-display'),
            yearlyList: document.getElementById('yearly-list'),
            yearlyTotal: document.getElementById('yearly-total'),
            yearlyView: document.getElementById('yearly-view'),
            
            // Blacklist view elements
            blacklistView: document.getElementById('blacklist-view'),
            blacklistNameInput: document.getElementById('blacklist-name'),
            addToBlacklistBtn: document.getElementById('add-to-blacklist'),
            blacklistList: document.getElementById('blacklist-list'),
            
            // Reports view elements
            reportsView: document.getElementById('reports-view'),
            reportTypeSelect: document.getElementById('report-type'),
            reportMemberSelect: document.getElementById('report-member'),
            memberSelectGroup: document.getElementById('member-select-group'),
            statusFilter: document.getElementById('status-filter'),
            statusFilterGroup: document.getElementById('status-filter-group'),
            reportStartMonth: document.getElementById('report-start-month'),
            reportStartYear: document.getElementById('report-start-year'),
            reportEndMonth: document.getElementById('report-end-month'),
            reportEndYear: document.getElementById('report-end-year'),
            generateReportBtn: document.getElementById('generate-report-btn'),
            reportOutput: document.getElementById('report-output'),
            reportTitle: document.getElementById('report-title'),
            reportContent: document.getElementById('report-content'),
            exportReportText: document.getElementById('export-report-text'),
            printReport: document.getElementById('print-report'),
            shareReportWhatsapp: document.getElementById('share-report-whatsapp'),
            
            // WhatsApp and actions
            phoneNumberInput: document.getElementById('phone-number'),
            savePhoneBtn: document.getElementById('save-phone'),
            sendWhatsAppBtn: document.getElementById('send-whatsapp'),
            actionSection: document.querySelector('.actions'),
            exportDataBtn: document.getElementById('export-data'),
            
            // Expected members management
            expectedMemberNameInput: document.getElementById('expected-member-name'),
            expectedMemberAmountInput: document.getElementById('expected-member-amount'),
            addExpectedMemberBtn: document.getElementById('add-expected-member'),
            expectedMembersList: document.getElementById('expected-members-list'),
            
            // Budget view elements
            budgetContent: document.getElementById('budget-content'),
            addExpenseBtn: document.getElementById('add-expense-btn'),
            expenseAmount: document.getElementById('expense-amount'),
            expenseCategory: document.getElementById('expense-category'),
            expenseDate: document.getElementById('expense-date'),
            expenseDescription: document.getElementById('expense-description'),
            filterType: document.getElementById('filter-type'),
            filterCategory: document.getElementById('filter-category'),
            filterStartDate: document.getElementById('filter-start-date'),
            filterEndDate: document.getElementById('filter-end-date'),
            dateRangeFilters: document.getElementById('date-range-filters'),
            applyDateFilter: document.getElementById('apply-date-filter'),
            expensesTbody: document.getElementById('expenses-tbody'),
            
            // Special giving elements
            createCampaignBtn: document.getElementById('create-campaign-btn'),
            specialGivingContent: document.getElementById('special-giving-content'),
            
            // Admin dashboard elements
            backToAppBtn: document.getElementById('back-to-app-btn'),
            exportUsersBtn: document.getElementById('export-users-csv'),
            exportFinancialBtn: document.getElementById('export-financial-csv'),
            adminUserList: document.getElementById('admin-user-list'),
            yearSelector: document.getElementById('year-selector'),
            totalContributions: document.getElementById('total-contributions'),
            totalPaid: document.getElementById('total-paid'),
            totalUnpaid: document.getElementById('total-unpaid'),
            totalExpenses: document.getElementById('total-expenses'),
            percentPaid: document.getElementById('percent-paid'),
            activeContributors: document.getElementById('active-contributors'),
            
            // Footer
            currentYearFooter: document.getElementById('current-year-footer')
        };
    }

    return {
        // Initialize all DOM references
        init() {
            initializeElements();
        },

        // Get specific element
        get(elementName) {
            return elements[elementName];
        },

        // Get multiple elements
        getMultiple(elementNames) {
            const result = {};
            elementNames.forEach(name => {
                result[name] = elements[name];
            });
            return result;
        },

        // Get all elements
        getAll() {
            return elements;
        },

        // Get elements by category
        getMonthlyViewElements() {
            return {
                contributionsList: elements.contributionsList,
                totalAmountPaidDisplay: elements.totalAmountPaidDisplay,
                totalAmountUnpaidDisplay: elements.totalAmountUnpaidDisplay,
                currentMonthDisplay: elements.currentMonthDisplay,
                currentYearDisplay: elements.currentYearDisplay,
                monthlyView: elements.monthlyView
            };
        },

        getYearlyViewElements() {
            return {
                yearlyDisplay: elements.yearlyDisplay,
                yearlyList: elements.yearlyList,
                yearlyTotal: elements.yearlyTotal,
                yearlyView: elements.yearlyView
            };
        },

        getBlacklistViewElements() {
            return {
                blacklistView: elements.blacklistView,
                blacklistNameInput: elements.blacklistNameInput,
                addToBlacklistBtn: elements.addToBlacklistBtn,
                blacklistList: elements.blacklistList
            };
        },

        getReportsViewElements() {
            return {
                reportsView: elements.reportsView,
                reportTypeSelect: elements.reportTypeSelect,
                reportMemberSelect: elements.reportMemberSelect,
                memberSelectGroup: elements.memberSelectGroup,
                statusFilter: elements.statusFilter,
                statusFilterGroup: elements.statusFilterGroup,
                reportStartMonth: elements.reportStartMonth,
                reportStartYear: elements.reportStartYear,
                reportEndMonth: elements.reportEndMonth,
                reportEndYear: elements.reportEndYear,
                generateReportBtn: elements.generateReportBtn,
                reportOutput: elements.reportOutput,
                reportTitle: elements.reportTitle,
                reportContent: elements.reportContent,
                exportReportText: elements.exportReportText,
                printReport: elements.printReport,
                shareReportWhatsapp: elements.shareReportWhatsapp
            };
        },

        getFormElements() {
            return {
                contributionForm: elements.contributionForm,
                contributionSection: elements.contributionSection,
                memberNameInput: elements.memberNameInput,
                contributionAmountInput: elements.contributionAmountInput,
                contributionPaidInput: elements.contributionPaidInput
            };
        },

        getBudgetViewElements() {
            return {
                budgetContent: elements.budgetContent,
                addExpenseBtn: elements.addExpenseBtn,
                expenseAmount: elements.expenseAmount,
                expenseCategory: elements.expenseCategory,
                expenseDate: elements.expenseDate,
                expenseDescription: elements.expenseDescription,
                filterType: elements.filterType,
                filterCategory: elements.filterCategory,
                filterStartDate: elements.filterStartDate,
                filterEndDate: elements.filterEndDate,
                dateRangeFilters: elements.dateRangeFilters,
                applyDateFilter: elements.applyDateFilter,
                expensesTbody: elements.expensesTbody
            };
        },

        getSpecialGivingElements() {
            return {
                createCampaignBtn: elements.createCampaignBtn,
                specialGivingContent: elements.specialGivingContent
            };
        },

        getAdminDashboardElements() {
            return {
                backToAppBtn: elements.backToAppBtn,
                exportUsersBtn: elements.exportUsersBtn,
                exportFinancialBtn: elements.exportFinancialBtn,
                adminUserList: elements.adminUserList,
                yearSelector: elements.yearSelector,
                totalContributions: elements.totalContributions,
                totalPaid: elements.totalPaid,
                totalUnpaid: elements.totalUnpaid,
                totalExpenses: elements.totalExpenses,
                percentPaid: elements.percentPaid,
                activeContributors: elements.activeContributors
            };
        },

        // Check if all required elements exist
        validateElements() {
            const missing = [];
            for (const [key, element] of Object.entries(elements)) {
                if (!element) {
                    missing.push(key);
                }
            }
            
            if (missing.length > 0) {
                console.warn('Missing DOM elements:', missing);
                return false;
            }
            return true;
        }
    };
})();
