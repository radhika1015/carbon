/**
 * Copyright IBM Corp. 2016, 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { CaretDown } from '@carbon/icons-react';
import classNames from 'classnames';
import { keys, match, matches } from '../../internal/keyboard';
import uniqueId from '../../tools/uniqueId';
import { usePrefix } from '../../internal/usePrefix';

const TreeNode = React.forwardRef(
  (
    {
      active,
      children,
      className,
      depth,
      disabled,
      isExpanded,
      label,
      onNodeFocusEvent,
      onSelect: onNodeSelect,
      onToggle,
      onTreeSelect,
      renderIcon: Icon,
      selected,
      value,
      ...rest
    },
    ref
  ) => {
    const { current: id } = useRef(rest.id || uniqueId());
    const [expanded, setExpanded] = useState(isExpanded);
    const currentNode = useRef(null);
    const currentNodeLabel = useRef(null);
    const prefix = usePrefix();
    const nodesWithProps = React.Children.map(children, (node) => {
      if (React.isValidElement(node)) {
        return React.cloneElement(node, {
          active,
          depth: depth + 1,
          disabled,
          onTreeSelect,
          selected,
          tabIndex: (!node.props.disabled && -1) || null,
        });
      }
    });
    const isActive = active === id;
    const isSelected = selected.includes(id);
    const treeNodeClasses = classNames(className, `${prefix}--tree-node`, {
      [`${prefix}--tree-node--active`]: isActive,
      [`${prefix}--tree-node--disabled`]: disabled,
      [`${prefix}--tree-node--selected`]: isSelected,
      [`${prefix}--tree-node--with-icon`]: Icon,
      [`${prefix}--tree-leaf-node`]: !children,
      [`${prefix}--tree-parent-node`]: children,
    });
    const toggleClasses = classNames(
      `${prefix}--tree-parent-node__toggle-icon`,
      {
        [`${prefix}--tree-parent-node__toggle-icon--expanded`]: expanded,
      }
    );
    function handleToggleClick(event) {
      if (disabled) {
        return;
      }

      // Prevent the node from being selected
      event.stopPropagation();

      onToggle?.(event, { id, isExpanded: !expanded, label, value });
      setExpanded(!expanded);
    }
    function handleClick(event) {
      event.stopPropagation();
      if (!disabled) {
        onTreeSelect?.(event, { id, label, value });
        onNodeSelect?.(event, { id, label, value });
        rest?.onClick?.(event);
      }
    }
    function handleKeyDown(event) {
      if (disabled) {
        return;
      }
      if (matches(event, [keys.ArrowLeft, keys.ArrowRight, keys.Enter])) {
        event.stopPropagation();
      }
      if (match(event, keys.ArrowLeft)) {
        const findParentTreeNode = (node) => {
          if (node.classList.contains(`${prefix}--tree-parent-node`)) {
            return node;
          }
          if (node.classList.contains(`${prefix}--tree`)) {
            return null;
          }
          return findParentTreeNode(node.parentNode);
        };
        if (children && expanded) {
          onToggle?.(event, { id, isExpanded: false, label, value });
          setExpanded(false);
        } else {
          /**
           * When focus is on a leaf node or a closed parent node, move focus to
           * its parent node (unless its depth is level 1)
           */
          findParentTreeNode(currentNode.current.parentNode)?.focus();
        }
      }
      if (children && match(event, keys.ArrowRight)) {
        if (expanded) {
          /**
           * When focus is on an expanded parent node, move focus to the first
           * child node
           */
          currentNode.current.lastChild.firstChild.focus();
        } else {
          onToggle?.(event, { id, isExpanded: true, label, value });
          setExpanded(true);
        }
      }
      if (matches(event, [keys.Enter, keys.Space])) {
        event.preventDefault();
        handleClick(event);
      }
      rest?.onKeyDown?.(event);
    }
    function handleFocusEvent(event) {
      if (event.type === 'blur') {
        rest?.onBlur?.(event);
      }
      if (event.type === 'focus') {
        rest?.onFocus?.(event);
      }
      onNodeFocusEvent?.(event);
    }

    useEffect(() => {
      /**
       * Negative margin shifts node to align with the left side boundary of the
       * tree
       * Dynamically calculate padding to recreate tree node indentation
       * - parent nodes with icon have (depth + 1rem + depth * 0.5) left padding
       * - parent nodes have (depth + 1rem) left padding
       * - leaf nodes have (depth + 2.5rem) left padding without icons (because
       *   of expand icon + spacing)
       * - leaf nodes have (depth + 2rem + depth * 0.5) left padding with icons (because of
       *   reduced spacing between the expand icon and the node icon + label)
       */
      const calcOffset = () => {
        // parent node with icon
        if (children && Icon) {
          return depth + 1 + depth * 0.5;
        }
        // parent node without icon
        if (children) {
          return depth + 1;
        }
        // leaf node with icon
        if (Icon) {
          return depth + 2 + depth * 0.5;
        }
        // leaf node without icon
        return depth + 2.5;
      };

      if (currentNodeLabel.current) {
        currentNodeLabel.current.style.marginInlineStart = `-${calcOffset()}rem`;
        currentNodeLabel.current.style.paddingInlineStart = `${calcOffset()}rem`;
      }

      // sync props and state
      setExpanded(isExpanded);
    }, [children, depth, Icon, isExpanded]);

    const treeNodeProps = {
      ...rest,
      ['aria-current']: isActive || null,
      ['aria-selected']: disabled ? null : isSelected,
      ['aria-disabled']: disabled,
      className: treeNodeClasses,
      id,
      onBlur: handleFocusEvent,
      onClick: handleClick,
      onFocus: handleFocusEvent,
      onKeyDown: handleKeyDown,
      ref: currentNode,
      role: 'treeitem',
    };

    if (!children) {
      return (
        <li {...treeNodeProps}>
          <div className={`${prefix}--tree-node__label`} ref={currentNodeLabel}>
            {Icon && <Icon className={`${prefix}--tree-node__icon`} />}
            {label}
          </div>
        </li>
      );
    }
    return (
      // eslint-disable-next-line jsx-a11y/role-supports-aria-props
      <li {...treeNodeProps} aria-expanded={!!expanded} ref={ref}>
        <div className={`${prefix}--tree-node__label`} ref={currentNodeLabel}>
          {/* https://github.com/carbon-design-system/carbon/pull/6008#issuecomment-675738670 */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <span
            className={`${prefix}--tree-parent-node__toggle`}
            disabled={disabled}
            onClick={handleToggleClick}>
            <CaretDown className={toggleClasses} />
          </span>
          <span className={`${prefix}--tree-node__label__details`}>
            {Icon && <Icon className={`${prefix}--tree-node__icon`} />}
            {label}
          </span>
        </div>
        {expanded && (
          <ul role="group" className={`${prefix}--tree-node__children`}>
            {nodesWithProps}
          </ul>
        )}
      </li>
    );
  }
);

TreeNode.propTypes = {
  /**
   * The value of the active node in the tree
   */
  active: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),

  /**
   * Specify the children of the TreeNode
   */
  children: PropTypes.node,

  /**
   * Specify an optional className to be applied to the TreeNode
   */
  className: PropTypes.string,

  /**
   * TreeNode depth to determine spacing, automatically calculated by default
   */
  depth: PropTypes.number,

  /**
   * Specify if the TreeNode is disabled
   */
  disabled: PropTypes.bool,

  /**
   * Specify if the TreeNode is expanded (only applicable to parent nodes)
   */
  isExpanded: PropTypes.bool,

  /**
   * Rendered label for the TreeNode
   */
  label: PropTypes.node,

  /**
   * Callback function for when the node receives or loses focus
   */
  onNodeFocusEvent: PropTypes.func,

  /**
   * Callback function for when the node is selected
   */
  onSelect: PropTypes.func,

  /**
   * Callback function for when a parent node is expanded or collapsed
   */
  onToggle: PropTypes.func,

  /**
   * Callback function for when any node in the tree is selected
   */
  onTreeSelect: PropTypes.func,

  /**
   * Optional prop to allow each node to have an associated icon.
   * Can be a React component class
   */
  renderIcon: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),

  /**
   * Array containing all selected node IDs in the tree
   */
  selected: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ),

  /**
   * Specify the value of the TreeNode
   */
  value: PropTypes.string,
};

TreeNode.displayName = 'TreeNode';
export default TreeNode;
