// UI Renderer Module
// Handles all UI rendering logic for different views

const UIRenderer = (function() {
    return {
        // Render monthly view
        renderMonthlyView(contributionsData, currentYear, currentMonth, eventHandlers) {
            const dom = DOMManager.getMonthlyViewElements();
            
            dom.currentMonthDisplay.textContent = currentMonth;
            dom.currentYearDisplay.textContent = currentYear;
            dom.contributionsList.innerHTML = '';

            const currentData = contributionsData[currentYear]?.[currentMonth] || { contributions: [], total: 0 };

            if (currentData.contributions.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = Templates.MONTHLY_EMPTY_STATE;
                dom.contributionsList.appendChild(row);
            } else {
                currentData.contributions.forEach((item, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = Templates.MONTHLY_CONTRIBUTION_ROW(item, index);
                    dom.contributionsList.appendChild(row);
                });

                // Attach event listeners
                if (eventHandlers) {
                    dom.contributionsList.querySelectorAll('.toggle-payment').forEach(btn => {
                        btn.addEventListener('click', eventHandlers.togglePaymentStatus);
                    });

                    dom.contributionsList.querySelectorAll('.remove-contribution').forEach(btn => {
                        btn.addEventListener('click', eventHandlers.removeContribution);
                    });

                    dom.contributionsList.querySelectorAll('.blacklist-member').forEach(btn => {
                        btn.addEventListener('click', eventHandlers.handleBlacklistMember);
                    });

                    dom.contributionsList.querySelectorAll('.edit-contribution').forEach(btn => {
                        btn.addEventListener('click', eventHandlers.editContribution);
                    });
                }
            }

            // Update totals
            this.updateTotals(contributionsData, currentYear, currentMonth);
        },

        // Update total amount display
        updateTotals(contributionsData, currentYear, currentMonth) {
            const dom = DOMManager.getMonthlyViewElements();
            const totals = ContributionsManager.calculateTotals(contributionsData, currentYear, currentMonth);
            dom.totalAmountPaidDisplay.textContent = totals.totalPaid.toLocaleString();
            dom.totalAmountUnpaidDisplay.textContent = totals.totalUnpaid.toLocaleString();
        },

        // Render yearly view
        renderYearlyView(contributionsData, currentYear) {
            const dom = DOMManager.getYearlyViewElements();
            
            dom.yearlyDisplay.textContent = currentYear;
            dom.yearlyList.innerHTML = '';

            const months = moment.months();

            if (!contributionsData[currentYear]) {
                const row = document.createElement('tr');
                row.innerHTML = Templates.YEARLY_EMPTY_STATE;
                dom.yearlyList.appendChild(row);
                dom.yearlyTotal.textContent = 0;
                return;
            }

            const totals = ContributionsManager.calculateYearlyTotals(contributionsData, currentYear);

            for (const month of months) {
                const monthData = contributionsData[currentYear][month];

                if (monthData) {
                    let paidAmount = 0;
                    let unpaidAmount = 0;

                    for (const item of monthData.contributions) {
                        if (item.paid) {
                            paidAmount += item.amount;
                        } else {
                            unpaidAmount += item.amount;
                        }
                    }

                    const totalMonthAmount = paidAmount + unpaidAmount;
                    const row = document.createElement('tr');
                    row.innerHTML = Templates.YEARLY_MONTH_ROW(month, totalMonthAmount, paidAmount, unpaidAmount);
                    dom.yearlyList.appendChild(row);
                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = Templates.YEARLY_MONTH_ROW(month, 0, 0, 0);
                    dom.yearlyList.appendChild(row);
                }
            }

            const summaryRow = document.createElement('tr');
            summaryRow.classList.add('yearly-summary');
            summaryRow.innerHTML = Templates.YEARLY_SUMMARY_ROW(totals);
            dom.yearlyList.appendChild(summaryRow);

            dom.yearlyTotal.textContent = totals.monthlyTotalPaid;
        },

        // Render blacklist view
        renderBlacklistView(blacklistData, eventHandlers) {
            const dom = DOMManager.getBlacklistViewElements();
            dom.blacklistList.innerHTML = '';

            if (blacklistData.blacklistedMembers.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = Templates.BLACKLIST_EMPTY_STATE;
                dom.blacklistList.appendChild(row);
            } else {
                blacklistData.blacklistedMembers.forEach((name, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = Templates.BLACKLIST_MEMBER_ROW(name, index);
                    dom.blacklistList.appendChild(row);
                });

                // Attach event listeners
                if (eventHandlers && eventHandlers.removeFromBlacklist) {
                    dom.blacklistList.querySelectorAll('.remove-from-blacklist').forEach(btn => {
                        btn.addEventListener('click', eventHandlers.removeFromBlacklist);
                    });
                }
            }
        },

        // Clear form inputs
        clearContributionForm() {
            const dom = DOMManager.getFormElements();
            dom.memberNameInput.value = '';
            dom.contributionAmountInput.value = '';
            dom.contributionPaidInput.checked = true;
        },

        // Show/hide views
        showView(viewName) {
            const dom = DOMManager.getAll();
            
            // Hide all views
            dom.monthlyView.style.display = 'none';
            dom.yearlyView.style.display = 'none';
            dom.blacklistView.style.display = 'none';
            dom.reportsView.style.display = 'none';
            
            const settingsView = document.getElementById('settings-view');
            const specialGivingView = document.getElementById('special-giving-view');
            const budgetView = document.getElementById('budget-view');
            
            if (settingsView) settingsView.style.display = 'none';
            if (specialGivingView) specialGivingView.style.display = 'none';
            if (budgetView) budgetView.style.display = 'none';

            // Show selected view
            switch(viewName) {
                case 'monthly':
                    dom.monthlyView.style.display = 'block';
                    break;
                case 'yearly':
                    dom.yearlyView.style.display = 'block';
                    break;
                case 'blacklist':
                    dom.blacklistView.style.display = 'block';
                    break;
                case 'reports':
                    dom.reportsView.style.display = 'block';
                    break;
                case 'settings':
                    if (settingsView) settingsView.style.display = 'block';
                    break;
                case 'budget':
                    if (budgetView) budgetView.style.display = 'block';
                    break;
                case 'special-giving':
                    if (specialGivingView) specialGivingView.style.display = 'block';
                    break;
            }
        },

        // Apply role-based UI restrictions
        applyRoleRestrictions(userRole) {
            const dom = DOMManager.getAll();
            const isAdmin = userRole === 'admin';
            const isViewer = userRole === 'viewer';

            const editorElements = [
                dom.contributionSection,
                dom.contributionForm,
                dom.createMonthBtn,
                dom.actionSection
            ];

            const adminElements = [
                ...document.querySelectorAll('.blacklist-member'),
                dom.blacklistNameInput,
                dom.addToBlacklistBtn
            ];

            // Hide/show budget tab based on admin role
            const budgetTabBtn = document.querySelector('[data-view="budget"]');
            if (budgetTabBtn) {
                budgetTabBtn.style.display = isAdmin ? 'flex' : 'none';
            }

            if (isViewer) {
                editorElements.forEach(el => { if (el) el.style.display = 'none'; });
            }

            if (!isAdmin) {
                adminElements.forEach(el => { if (el) el.style.display = 'none'; });
            }

            document.querySelectorAll('.toggle-payment, .remove-contribution, .edit-contribution, .remove-from-blacklist').forEach(el => {
                if (isViewer) el.style.display = 'none';
            });
        },

        // Render special giving campaigns
        renderSpecialGivingView(campaigns) {
            const container = document.getElementById('special-giving-content');
            if (!container) return;

            if (campaigns.length === 0) {
                container.innerHTML = Templates.CAMPAIGN_EMPTY_STATE;
                return;
            }

            let html = '<div class="campaigns-overview">';
            campaigns.forEach(campaign => {
                html += Templates.CAMPAIGN_CARD(campaign);
            });
            html += '</div>';

            container.innerHTML = html;
        }
    };
})();
