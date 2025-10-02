/**
 * Utility functions for handling project hierarchy
 */
export class ProjectHierarchy {
  /**
   * Parse a project name into components
   * @param {string} project - Project name (e.g., "business/quote")
   * @returns {Array<string>} - Array of path components
   */
  static parseProject(project) {
    return project.split('/').filter((p) => p.trim().length > 0);
  }

  /**
   * Get the parent project name
   * @param {string} project - Project name (e.g., "business/quote")
   * @returns {string|null} - Parent project name or null if no parent
   */
  static getParent(project) {
    const parts = this.parseProject(project);
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('/');
  }

  /**
   * Check if a project is a parent of another
   * @param {string} parent - Potential parent project
   * @param {string} child - Potential child project
   * @returns {boolean} - True if parent is a parent of child
   */
  static isParentOf(parent, child) {
    if (parent === child) return false;
    const parentParts = this.parseProject(parent);
    const childParts = this.parseProject(child);
    
    if (childParts.length <= parentParts.length) return false;
    
    for (let i = 0; i < parentParts.length; i++) {
      if (parentParts[i] !== childParts[i]) return false;
    }
    
    return true;
  }

  /**
   * Get the depth of a project in the hierarchy
   * @param {string} project - Project name
   * @returns {number} - Depth (0 for root projects)
   */
  static getDepth(project) {
    return this.parseProject(project).length - 1;
  }

  /**
   * Calculate hierarchical project statistics
   * @param {Object} flatStats - Flat project stats
   * @returns {Object} - Hierarchical stats with parent/child relationships
   */
  static calculateHierarchicalStats(flatStats) {
    const hierarchical = {};
    const projectNames = Object.keys(flatStats);
    
    // Initialize all projects
    projectNames.forEach((project) => {
      hierarchical[project] = {
        ...flatStats[project],
        children: [],
        directMinutes: flatStats[project].totalMinutes,
      };
    });
    
    // Build parent-child relationships and calculate totals
    projectNames.forEach((project) => {
      const parent = this.getParent(project);
      if (parent && hierarchical[parent]) {
        hierarchical[parent].children.push(project);
      }
    });
    
    // Calculate total minutes including children (recursive)
    const calculateTotalMinutes = (project) => {
      const stats = hierarchical[project];
      let total = stats.directMinutes;
      
      stats.children.forEach((child) => {
        total += calculateTotalMinutes(child);
      });
      
      stats.totalMinutes = total;
      return total;
    };
    
    // Only calculate for root projects (will recurse to children)
    projectNames
      .filter((p) => !this.getParent(p) || !hierarchical[this.getParent(p)])
      .forEach((project) => {
        calculateTotalMinutes(project);
      });
    
    return hierarchical;
  }

  /**
   * Get root projects (projects with no parents in the stats)
   * @param {Object} hierarchicalStats - Hierarchical project stats
   * @returns {Array<string>} - List of root project names
   */
  static getRootProjects(hierarchicalStats) {
    return Object.keys(hierarchicalStats).filter((project) => {
      const parent = this.getParent(project);
      return !parent || !hierarchicalStats[parent];
    });
  }
}
