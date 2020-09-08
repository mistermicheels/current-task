class TodoistTaskMerger {
    mergeSubtasksMarkedCurrentWithParentMarkedCurrent(tasksFromApi, currentTaskLabelId) {
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

            const parentHasLabel = this._taskHasLabel(currentParent, currentTaskLabelId);
            const childrenWithLabel = this._getTasksWithLabel(children, currentTaskLabelId);

            if (parentHasLabel && childrenWithLabel.length > 0) {
                tasksToKeepById.delete(currentParentId);
                childrenWithLabel.forEach((child) => (child.due = child.due || currentParent.due));
            }

            children.forEach((task) => tasksToKeepById.set(task.id, task));
            tasksToConsiderByParentId.delete(currentParentId);
        }

        return Array.from(tasksToKeepById.values());
    }

    /** @returns {Map<number, any[]>} */
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

    _taskHasLabel(taskFromApi, currentTaskLabelId) {
        return taskFromApi.label_ids.includes(currentTaskLabelId);
    }

    _getTasksWithLabel(tasksFromApi, currentTaskLabelId) {
        return tasksFromApi.filter((task) => this._taskHasLabel(task, currentTaskLabelId));
    }
}

module.exports = TodoistTaskMerger;
