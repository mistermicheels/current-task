class TodoistFilterGenerator {
    /**
     * @param {string} currentTaskLabelName
     * @param {{ includeFutureTasksWithLabel: boolean }} options
     */
    getRelevantTasksForStateFilter(currentTaskLabelName, options) {
        let dateAndLabelCondition;

        if (options.includeFutureTasksWithLabel) {
            dateAndLabelCondition = `(today | overdue | @${currentTaskLabelName})`;
        } else {
            dateAndLabelCondition = `(today | overdue | (no date & @${currentTaskLabelName}))`;
        }

        return `${dateAndLabelCondition} & ${this._getAssignmentCondition()}`;
    }

    _getAssignmentCondition() {
        return "(!assigned | assigned to: me)";
    }

    getFutureTasksWithLabelFilter(currentTaskLabelName) {
        return `Due after: today & @${currentTaskLabelName} & ${this._getAssignmentCondition()}`;
    }
}

module.exports = TodoistFilterGenerator;
