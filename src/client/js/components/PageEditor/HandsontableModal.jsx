import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'react-bootstrap/es/Modal';
import Button from 'react-bootstrap/es/Button';
import ButtonGroup from 'react-bootstrap/es/ButtonGroup';
import Collapse from 'react-bootstrap/es/Collapse';
import Handsontable from 'handsontable';
import { HotTable } from '@handsontable/react';
import { debounce } from 'throttle-debounce';

import MarkdownTableDataImportForm from './MarkdownTableDataImportForm';
import MarkdownTable from '../../models/MarkdownTable';

const DEFAULT_HOT_HEIGHT = 300;
const MARKDOWNTABLE_TO_HANDSONTABLE_ALIGNMENT_SYMBOL_MAPPING = {
  r: 'htRight',
  c: 'htCenter',
  l: 'htLeft',
  '': '',
};

export default class HandsontableModal extends React.PureComponent {

  constructor(props) {
    super(props);

    /*
     * ## Note ##
     * Currently, this component try to synchronize the cells data and alignment data of state.markdownTable with these of the HotTable.
     * However, changes made by the following operations are not synchronized.
     *
     * 1. move columns: Alignment changes are synchronized but data changes are not.
     * 2. move rows: Data changes are not synchronized.
     * 3. insert columns or rows: Data changes are synchronized but alignment changes are not.
     * 4. delete columns or rows: Data changes are synchronized but alignment changes are not.
     *
     * However, all operations are reflected in the data to be saved because the HotTable data is used when the save method is called.
     */
    this.state = {
      show: false,
      isDataImportAreaExpanded: false,
      isWindowExpanded: false,
      markdownTableOnInit: HandsontableModal.getDefaultMarkdownTable(),
      markdownTable: HandsontableModal.getDefaultMarkdownTable(),
      handsontableHeight: DEFAULT_HOT_HEIGHT,
    };

    this.init = this.init.bind(this);
    this.reset = this.reset.bind(this);
    this.cancel = this.cancel.bind(this);
    this.save = this.save.bind(this);
    this.afterLoadDataHandler = this.afterLoadDataHandler.bind(this);
    this.beforeColumnResizeHandler = this.beforeColumnResizeHandler.bind(this);
    this.afterColumnResizeHandler = this.afterColumnResizeHandler.bind(this);
    this.modifyColWidthHandler = this.modifyColWidthHandler.bind(this);
    this.beforeColumnMoveHandler = this.beforeColumnMoveHandler.bind(this);
    this.afterColumnMoveHandler = this.afterColumnMoveHandler.bind(this);
    this.synchronizeAlignment = this.synchronizeAlignment.bind(this);
    this.alignButtonHandler = this.alignButtonHandler.bind(this);
    this.toggleDataImportArea = this.toggleDataImportArea.bind(this);
    this.importData = this.importData.bind(this);
    this.expandWindow = this.expandWindow.bind(this);
    this.contractWindow = this.contractWindow.bind(this);

    // create debounced method for expanding HotTable
    this.expandHotTableHeightWithDebounce = debounce(100, this.expandHotTableHeight);

    // a Set instance that stores column indices which are resized manually.
    // these columns will NOT be determined the width automatically by 'modifyColWidthHandler'
    this.manuallyResizedColumnIndicesSet = new Set();

    // generate setting object for HotTable instance
    this.handsontableSettings = Object.assign(HandsontableModal.getDefaultHandsontableSetting(), {
      contextMenu: this.createCustomizedContextMenu(),
    });
  }

  init(markdownTable) {
    const initMarkdownTable = markdownTable || HandsontableModal.getDefaultMarkdownTable();
    this.setState(
      {
        markdownTableOnInit: initMarkdownTable,
        markdownTable: initMarkdownTable.clone(),
      },
    );

    this.manuallyResizedColumnIndicesSet.clear();
  }

  createCustomizedContextMenu() {
    return {
      items: {
        row_above: {},
        row_below: {},
        col_left: {},
        col_right: {},
        separator1: Handsontable.plugins.ContextMenu.SEPARATOR,
        remove_row: {},
        remove_col: {},
        separator2: Handsontable.plugins.ContextMenu.SEPARATOR,
        custom_alignment: {
          name: 'Align columns',
          key: 'align_columns',
          submenu: {
            items: [
              {
                name: 'Left',
                key: 'align_columns:1',
                callback: (key, selection) => { this.align('l', selection[0].start.col, selection[0].end.col) },
              }, {
                name: 'Center',
                key: 'align_columns:2',
                callback: (key, selection) => { this.align('c', selection[0].start.col, selection[0].end.col) },
              }, {
                name: 'Right',
                key: 'align_columns:3',
                callback: (key, selection) => { this.align('r', selection[0].start.col, selection[0].end.col) },
              },
            ],
          },
        },
      },
    };
  }

  show(markdownTable) {
    this.init(markdownTable);
    this.setState({ show: true });
  }

  hide() {
    this.setState({
      show: false,
      isDataImportAreaExpanded: false,
      isWindowExpanded: false,
    });
  }

  /**
   * Reset table data to initial value
   *
   * ## Note ##
   * It may not return completely to the initial state because of the manualColumnMove operations.
   * https://github.com/handsontable/handsontable/issues/5591
   */
  reset() {
    this.setState({ markdownTable: this.state.markdownTableOnInit.clone() });
  }

  cancel() {
    this.hide();
  }

  save() {
    const markdownTable = new MarkdownTable(
      this.hotTable.hotInstance.getData(),
      { align: [].concat(this.state.markdownTable.options.align) },
    ).normalizeCells();

    if (this.props.onSave != null) {
      this.props.onSave(markdownTable);
    }

    this.hide();
  }

  /**
   * An afterLoadData hook
   *
   * This performs the following operations.
   * - clear 'manuallyResizedColumnIndicesSet' for the first loading
   * - synchronize the handsontable alignment to the markdowntable alignment
   *
   * ## Note ##
   * The afterLoadData hook is called when one of the following states of this component are passed into the setState.
   *
   * - markdownTable
   * - handsontableHeight
   *
   * In detail, when the setState method is called with those state passed,
   * React will start re-render process for the HotTable of this component because the HotTable receives those state values by props.
   * HotTable#shouldComponentUpdate is called in this re-render process and calls the updateSettings method for the Handsontable instance.
   * In updateSettings method, the loadData method is called in some case.
   *  (refs: https://github.com/handsontable/handsontable/blob/6.2.0/src/core.js#L1652-L1657)
   * The updateSettings method calls in the HotTable always lead to call the loadData method because the HotTable passes data source by settings.data.
   * After the loadData method is executed, afterLoadData hooks are called.
   */
  afterLoadDataHandler(initialLoad) {
    if (initialLoad) {
      this.manuallyResizedColumnIndicesSet.clear();
    }

    this.synchronizeAlignment();
  }

  beforeColumnResizeHandler(currentColumn) {
    /*
     * The following bug disturbs to use 'beforeColumnResizeHandler' to store column index -- 2018.10.23 Yuki Takei
     * https://github.com/handsontable/handsontable/issues/3328
     *
     * At the moment, using 'afterColumnResizeHandler' instead.
     */

    // store column index
    // this.manuallyResizedColumnIndicesSet.add(currentColumn);
  }

  afterColumnResizeHandler(currentColumn) {
    /*
     * The following bug disturbs to use 'beforeColumnResizeHandler' to store column index -- 2018.10.23 Yuki Takei
     * https://github.com/handsontable/handsontable/issues/3328
     *
     * At the moment, using 'afterColumnResizeHandler' instead.
     */

    // store column index
    this.manuallyResizedColumnIndicesSet.add(currentColumn);
    // force re-render
    const hotInstance = this.hotTable.hotInstance;
    hotInstance.render();
  }

  modifyColWidthHandler(width, column) {
    // return original width if the column index exists in 'manuallyResizedColumnIndicesSet'
    if (this.manuallyResizedColumnIndicesSet.has(column)) {
      return width;
    }
    // return fixed width if first initializing
    return Math.max(80, Math.min(400, width));
  }

  beforeColumnMoveHandler(columns, target) {
    // clear 'manuallyResizedColumnIndicesSet'
    this.manuallyResizedColumnIndicesSet.clear();
  }

  /**
   * An afterColumnMove hook.
   *
   * This synchronizes alignment when columns are moved by manualColumnMove
   */
  afterColumnMoveHandler(columns, target) {
    const align = [].concat(this.state.markdownTable.options.align);
    const removed = align.splice(columns[0], columns.length);

    /*
     * The following is a description of the algorithm for the alignment synchronization.
     *
     * Consider the case where the target is X and the columns are [2,3] and data is as follows.
     *
     * 0 1 2 3 4 5 (insert position number)
     * +-+-+-+-+-+
     * | | | | | |
     * +-+-+-+-+-+
     *  0 1 2 3 4  (column index number)
     *
     * At first, remove columns by the splice.
     *
     * 0 1 2   4 5
     * +-+-+   +-+
     * | | |   | |
     * +-+-+   +-+
     *  0 1     4
     *
     * Next, insert those columns into a new position.
     * However the target number is a insert position number before deletion, it may be changed.
     * These are changed as follows.
     *
     * Before:
     * 0 1 2   4 5
     * +-+-+   +-+
     * | | |   | |
     * +-+-+   +-+
     *
     * After:
     * 0 1 2   2 3
     * +-+-+   +-+
     * | | |   | |
     * +-+-+   +-+
     *
     * If X is 0, 1 or 2, that is, lower than columns[0], the target number is not changed.
     * If X is 4 or 5, that is, higher than columns[columns.length - 1], the target number is modified to the original value minus columns.length.
     *
     */
    let insertPosition = 0;
    if (target <= columns[0]) {
      insertPosition = target;
    }
    else if (columns[columns.length - 1] < target) {
      insertPosition = target - columns.length;
    }
    align.splice(...[insertPosition, 0].concat(removed));

    this.setState((prevState) => {
      // change only align info, so share table data to avoid redundant copy
      const newMarkdownTable = new MarkdownTable(prevState.markdownTable.table, { align });
      return { markdownTable: newMarkdownTable };
    }, () => {
      this.synchronizeAlignment();
    });
  }

  /**
   * change the markdownTable alignment and synchronize the handsontable alignment to it
   */
  align(direction, startCol, endCol) {
    this.setState((prevState) => {
      // change only align info, so share table data to avoid redundant copy
      const newMarkdownTable = new MarkdownTable(prevState.markdownTable.table, { align: [].concat(prevState.markdownTable.options.align) });
      for (let i = startCol; i <= endCol; i++) {
        newMarkdownTable.options.align[i] = direction;
      }
      return { markdownTable: newMarkdownTable };
    }, () => {
      this.synchronizeAlignment();
    });
  }

  /**
   * synchronize the handsontable alignment to the markdowntable alignment
   */
  synchronizeAlignment() {
    if (this.hotTable == null) {
      return;
    }

    const align = this.state.markdownTable.options.align;
    const hotInstance = this.hotTable.hotInstance;

    for (let i = 0; i < align.length; i++) {
      for (let j = 0; j < hotInstance.countRows(); j++) {
        hotInstance.setCellMeta(j, i, 'className', MARKDOWNTABLE_TO_HANDSONTABLE_ALIGNMENT_SYMBOL_MAPPING[align[i]]);
      }
    }
    hotInstance.render();
  }

  alignButtonHandler(direction) {
    const selectedRange = this.hotTable.hotInstance.getSelectedRange();
    if (selectedRange == null) return;

    let startCol;
    let endCol;

    if (selectedRange[0].from.col < selectedRange[0].to.col) {
      startCol = selectedRange[0].from.col;
      endCol = selectedRange[0].to.col;
    }
    else {
      startCol = selectedRange[0].to.col;
      endCol = selectedRange[0].from.col;
    }

    this.align(direction, startCol, endCol);
  }

  toggleDataImportArea() {
    this.setState({ isDataImportAreaExpanded: !this.state.isDataImportAreaExpanded });
  }

  /**
   * Import a markdowntable
   *
   * ## Note ##
   * The manualColumnMove operation affects the column order of imported data.
   * https://github.com/handsontable/handsontable/issues/5591
   */
  importData(markdownTable) {
    this.init(markdownTable);
    this.toggleDataImportArea();
  }

  expandWindow() {
    this.setState({ isWindowExpanded: true });

    // invoke updateHotTableHeight method with delay
    // cz. Resizing this.refs.hotTableContainer is completed after a little delay after 'isWindowExpanded' set with 'true'
    this.expandHotTableHeightWithDebounce();
  }

  contractWindow() {
    this.setState({ isWindowExpanded: false, handsontableHeight: DEFAULT_HOT_HEIGHT });
  }

  /**
   * Expand the height of the Handsontable
   *  by updating 'handsontableHeight' state
   *  according to the height of this.refs.hotTableContainer
   */
  expandHotTableHeight() {
    if (this.state.isWindowExpanded && this.hotTableContainer != null) {
      const height = this.hotTableContainer.getBoundingClientRect().height;
      this.setState({ handsontableHeight: height });
    }
  }

  renderExpandOrContractButton() {
    const iconClassName = this.state.isWindowExpanded ? 'icon-size-actual' : 'icon-size-fullscreen';
    return (
      <button type="button" className="close mr-3" onClick={this.state.isWindowExpanded ? this.contractWindow : this.expandWindow}>
        <i className={iconClassName} style={{ fontSize: '0.8em' }} aria-hidden="true"></i>
      </button>
    );
  }

  render() {
    const dialogClassNames = ['handsontable-modal'];
    if (this.state.isWindowExpanded) {
      dialogClassNames.push('handsontable-modal-expanded');
    }

    const dialogClassName = dialogClassNames.join(' ');

    return (
      <Modal show={this.state.show} onHide={this.cancel} bsSize="large" dialogClassName={dialogClassName}>
        <Modal.Header closeButton>
          { this.renderExpandOrContractButton() }
          <Modal.Title>Edit Table</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 d-flex flex-column">
          <div className="px-4 py-3 modal-navbar">
            <Button className="m-r-20 data-import-button" onClick={this.toggleDataImportArea}>
              Data Import<i className={this.state.isDataImportAreaExpanded ? 'fa fa-angle-up' : 'fa fa-angle-down'}></i>
            </Button>
            <ButtonGroup>
              <Button onClick={() => { this.alignButtonHandler('l') }}><i className="ti-align-left"></i></Button>
              <Button onClick={() => { this.alignButtonHandler('c') }}><i className="ti-align-center"></i></Button>
              <Button onClick={() => { this.alignButtonHandler('r') }}><i className="ti-align-right"></i></Button>
            </ButtonGroup>
            <Collapse in={this.state.isDataImportAreaExpanded}>
              <div> {/* This div is necessary for smoothing animations. (https://react-bootstrap.github.io/utilities/transitions/#transitions-collapse) */}
                <MarkdownTableDataImportForm onCancel={this.toggleDataImportArea} onImport={this.importData} />
              </div>
            </Collapse>
          </div>
          <div ref={(c) => { this.hotTableContainer = c }} className="m-4 hot-table-container">
            <HotTable
              ref={(c) => { this.hotTable = c }}
              data={this.state.markdownTable.table}
              settings={this.handsontableSettings}
              height={this.state.handsontableHeight}
              afterLoadData={this.afterLoadDataHandler}
              modifyColWidth={this.modifyColWidthHandler}
              beforeColumnMove={this.beforeColumnMoveHandler}
              beforeColumnResize={this.beforeColumnResizeHandler}
              afterColumnResize={this.afterColumnResizeHandler}
              afterColumnMove={this.afterColumnMoveHandler}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between">
            <Button bsStyle="danger" onClick={this.reset}>Reset</Button>
            <div className="d-flex">
              <Button bsStyle="default" onClick={this.cancel}>Cancel</Button>
              <Button bsStyle="primary" onClick={this.save}>Done</Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
    );
  }

  static getDefaultMarkdownTable() {
    return new MarkdownTable(
      [
        ['col1', 'col2', 'col3'],
        ['', '', ''],
        ['', '', ''],
      ],
      {
        align: ['', '', ''],
      },
    );
  }

  static getDefaultHandsontableSetting() {
    return {
      rowHeaders: true,
      colHeaders: true,
      manualRowMove: true,
      manualRowResize: true,
      manualColumnMove: true,
      manualColumnResize: true,
      selectionMode: 'multiple',
      outsideClickDeselects: false,
    };
  }

}

HandsontableModal.propTypes = {
  onSave: PropTypes.func,
};
