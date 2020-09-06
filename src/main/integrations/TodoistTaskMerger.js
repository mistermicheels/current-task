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

    _getTasksToConsiderByParentId(tasksFromApi) {
        const tasksFromApiByParentId = this._groupTasksByParentId(tasksFromApi);
        const allPresentTaskIds = new Set(tasksFromApi.map((task) => task.id));
        this._moveOrphansToTopLevel(tasksFromApiByParentId, allPresentTaskIds);
        return tasksFromApiByParentId;
    }

    /** @returns {Map<number, any[]>} */
    _groupTasksByParentId(tasksFromApi) {
        const tasksByParentId = new Map();

        for (const task of tasksFromApi) {
            const parentId = task.parent_id || null;
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
     * @param {Map<number, any[]>} tasksFromApiByParentId
     * @param {Set<number>} allPresentTaskIds
     */
    _moveOrphansToTopLevel(tasksFromApiByParentId, allPresentTaskIds) {
        const parentIds = Array.from(tasksFromApiByParentId.keys());

        let topLevelTasks = tasksFromApiByParentId.get(null);

        if (!topLevelTasks) {
            topLevelTasks = [];
            tasksFromApiByParentId.set(null, topLevelTasks);
        }

        for (const parentId of parentIds) {
            if (parentId !== null && !allPresentTaskIds.has(parentId)) {
                topLevelTasks.push(...tasksFromApiByParentId.get(parentId));
                tasksFromApiByParentId.delete(parentId);
            }
        }
    }

    _taskHasLabel(taskFromApi, currentTaskLabelId) {
        return taskFromApi.label_ids.includes(currentTaskLabelId);
    }

    _getTasksWithLabel(tasksFromApi, currentTaskLabelId) {
        return tasksFromApi.filter((task) => this._taskHasLabel(task, currentTaskLabelId));
    }
}

module.exports = TodoistTaskMerger;
