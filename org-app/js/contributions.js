// Contributions Manager Module
// Handles all contribution-related operations

const ContributionsManager = (function() {
    return {
        // Find the previous month with data
        findPreviousMonthData(contributionsData, currentYear, currentMonth) {
            const months = moment.months();
            let previousMonthData = null;
            const currentMonthIndex = months.indexOf(currentMonth);

            for (let i = currentMonthIndex - 1; i >= 0; i--) {
                const monthName = months[i];
                if (contributionsData[currentYear]?.[monthName]) {
                    previousMonthData = contributionsData[currentYear][monthName];
                    break;
                }
            }

            if (!previousMonthData && contributionsData[parseInt(currentYear) - 1]) {
                if (contributionsData[parseInt(currentYear) - 1].December) {
                    previousMonthData = contributionsData[parseInt(currentYear) - 1].December;
                }
            }

            return previousMonthData;
        },

        // Create month data from previous month
        createMonthDataFromPrevious(previousMonthData, blacklistData) {
            const newMonthData = {
                contributions: [],
                total: 0
            };

            if (previousMonthData) {
                for (const contribution of previousMonthData.contributions) {
                    if (!blacklistData.blacklistedMembers.includes(contribution.name)) {
                        newMonthData.contributions.push({
                            name: contribution.name,
                            amount: contribution.amount,
                            paid: false
                        });
                    }
                }

                let total = 0;
                for (const item of newMonthData.contributions) {
                    total += item.amount;
                }
                newMonthData.total = total;
            }

            return newMonthData;
        },

        // Add new members to existing month
        addNewMembersToExistingMonth(existingMonthData, previousMonthData, blacklistData) {
            const existingMemberNames = new Set();
            for (const contribution of existingMonthData.contributions) {
                existingMemberNames.add(contribution.name);
            }

            let newMembersAdded = 0;

            if (previousMonthData) {
                for (const contribution of previousMonthData.contributions) {
                    if (!existingMemberNames.has(contribution.name) &&
                        !blacklistData.blacklistedMembers.includes(contribution.name)) {
                        existingMonthData.contributions.push({
                            name: contribution.name,
                            amount: contribution.amount,
                            paid: false
                        });
                        newMembersAdded++;
                    }
                }

                let total = 0;
                for (const item of existingMonthData.contributions) {
                    total += item.amount;
                }
                existingMonthData.total = total;
            }

            return {
                data: existingMonthData,
                newMembersAdded
            };
        },

        // Add a contribution
        addContribution(contributionsData, currentYear, currentMonth, name, amount, paid) {
            if (!contributionsData[currentYear]) {
                contributionsData[currentYear] = {};
            }

            if (!contributionsData[currentYear][currentMonth]) {
                contributionsData[currentYear][currentMonth] = {
                    contributions: [],
                    total: 0
                };
            }

            if (!contributionsData[currentYear][currentMonth].contributions) {
                contributionsData[currentYear][currentMonth].contributions = [];
            }
            if (contributionsData[currentYear][currentMonth].total === undefined) {
                contributionsData[currentYear][currentMonth].total = 0;
            }

            contributionsData[currentYear][currentMonth].contributions.push({
                name,
                amount,
                paid
            });

            this.updateTotal(contributionsData, currentYear, currentMonth);
            return contributionsData;
        },

        // Update contribution total
        updateTotal(contributionsData, currentYear, currentMonth) {
            const currentData = contributionsData[currentYear][currentMonth];
            let total = 0;

            for (const item of currentData.contributions) {
                total += item.amount;
            }

            currentData.total = total;
        },

        // Toggle payment status
        togglePaymentStatus(contributionsData, currentYear, currentMonth, index) {
            const currentData = contributionsData[currentYear][currentMonth];
            currentData.contributions[index].paid = !currentData.contributions[index].paid;
            return contributionsData;
        },

        // Remove contribution
        removeContribution(contributionsData, currentYear, currentMonth, index) {
            const currentData = contributionsData[currentYear][currentMonth];
            currentData.contributions.splice(index, 1);
            this.updateTotal(contributionsData, currentYear, currentMonth);
            return contributionsData;
        },

        // Edit contribution
        editContribution(contributionsData, currentYear, currentMonth, index, name, amount, paid) {
            const currentData = contributionsData[currentYear][currentMonth];
            currentData.contributions[index].name = name;
            currentData.contributions[index].amount = amount;
            currentData.contributions[index].paid = paid;
            this.updateTotal(contributionsData, currentYear, currentMonth);
            return contributionsData;
        },

        // Calculate total amounts for display
        calculateTotals(contributionsData, currentYear, currentMonth) {
            const monthData = contributionsData[currentYear]?.[currentMonth] || { contributions: [], total: 0 };
            
            const totalPaid = monthData.contributions
                .filter(item => item.paid)
                .reduce((sum, item) => sum + item.amount, 0);
            
            const totalUnpaid = monthData.contributions
                .filter(item => !item.paid)
                .reduce((sum, item) => sum + item.amount, 0);

            return {
                totalAmount: monthData.total || 0,
                totalPaid,
                totalUnpaid
            };
        },

        // Calculate yearly totals
        calculateYearlyTotals(contributionsData, currentYear) {
            const months = moment.months();
            let yearlyTotalAmount = 0;
            let monthlyTotalPaid = 0;
            let monthlyTotalUnpaid = 0;

            for (const month of months) {
                const monthData = contributionsData[currentYear]?.[month];
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

                    yearlyTotalAmount += paidAmount + unpaidAmount;
                    monthlyTotalPaid += paidAmount;
                    monthlyTotalUnpaid += unpaidAmount;
                }
            }

            return {
                yearlyTotalAmount,
                monthlyTotalPaid,
                monthlyTotalUnpaid
            };
        }
    };
})();
