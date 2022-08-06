/** @typedef { import("./TodoistTask").TodoistTask } TodoistTask */

class TodoistTaskMerger {
    /**
     * @param {TodoistTask[]} tasksFromApi
     * @param {string} currentTaskLabelName
     */
    mergeSubtasksMarkedCurrentWithParentMarkedCurrent(tasksFromApi, currentTaskLabelName) {
        if (tasksFromApi.length === 0) {
            return tasksFromApi;
        }

        const tasksToConsiderByParentId = this._getTasksToConsiderByParentId(tasksFromApi);
        const tasksToKeepById = new Map();

        const topLevelTasks = tasksToConsiderByParentId.get(null);
        topLevelTasks.forEach((task) => tasksToKeepById.set(task.id, task));
        tasksToConsiderByParentId.delete(null);

        while (tasksToConsiderByParentId.size > 0) {
            const parentIds = Array.from(tasksToConsiderByParentId.keys());
            const alreadyIncluded = parentIds.filter((parentId) => tasksToKeepById.has(parentId));
            const currentParentId = alreadyIncluded[0];
            const currentParent = tasksToKeepById.get(currentParentId);
            const children = tasksToConsiderByParentId.get(currentParentId);

            const parentHasLabel = this._taskHasLabel(currentParent, currentTaskLabelName);
            const childrenWithLabel = this._getTasksWithLabel(children, currentTaskLabelName);

            if (parentHasLabel && childrenWithLabel.length > 0) {
                tasksToKeepById.delete(currentParentId);
                this._mergeParentDataIntoChildren(childrenWithLabel, currentParent);
            }

            children.forEach((task) => tasksToKeepById.set(task.id, task));
            tasksToConsiderByParentId.delete(currentParentId);
        }

        return Array.from(tasksToKeepById.values());
    }

    /** @returns {Map<number, TodoistTask[]>} */
    _getTasksToConsiderByParentId(tasksFromApi) {
        const allRetrievedTaskIds = new Set(tasksFromApi.map((task) => task.id));
        const tasksByParentId = new Map();

        for (const task of tasksFromApi) {
            let parentId = null;

            // only consider parent ID if parent was also retrieved
            if (task.parent_id && allRetrievedTaskIds.has(task.parent_id)) {
                parentId = task.parent_id;
            }

            let siblings = tasksByParentId.get(parentId);

            if (siblings) {
                siblings.push(task);
            } else {
                tasksByParentId.set(parentId, [task]);
            }
        }

        return tasksByParentId;
    }

    /**
     * @param {TodoistTask} taskFromApi
     * @param {string} currentTaskLabelName
     */
    _taskHasLabel(taskFromApi, currentTaskLabelName) {
        return taskFromApi.labels.includes(currentTaskLabelName);
    }

    /**
     * @param {TodoistTask[]} tasksFromApi
     * @param {string} currentTaskLabelName
     */
    _getTasksWithLabel(tasksFromApi, currentTaskLabelName) {
        return tasksFromApi.filter((task) => this._taskHasLabel(task, currentTaskLabelName));
    }

    /**
     * @param {TodoistTask[]} children
     * @param {TodoistTask} parent
     */
    _mergeParentDataIntoChildren(children, parent) {
        children.forEach((child) => {
            child.due = child.due || parent.due;
        });
    }
}

module.exports = TodoistTaskMerger;
