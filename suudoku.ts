const MAX_COUNT = 9

const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Solver')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fillArray = (Arr: any[], Value: any): void => {
  for (let i = 0; i < Arr.length; i++) {
    Arr[i] = Value
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayMatrix = (Arr: any[][]): void => {
  sheet.getRange(1, 11, 9, 9).setValues(Arr)
  Logger.log(JSON.stringify(Arr))
}

class Cell {
  private y_: number
  private x_: number

  public constructor(y: number, x: number) {
    if (x >= 0 && x <= 8 && y >= 0 && y <= 8) {
      this.y_ = y
      this.x_ = x
    } else {
      throw new Error(`Cell作成時の引数 y=${y},x=${x}が正しくありません`)
    }
  }

  public y(): number {
    return this.y_
  }

  public x(): number {
    return this.x_
  }

  public group(): number {
    return Math.floor(this.y_ / 3) * 3 + Math.floor(this.x_ / 3)
  }
}

class Step {
  public cell: Cell
  public number: number

  public constructor(cell, number) {
    this.cell = cell
    this.number = number
  }
}

class Constraint {
  private yConstraint_: number[]
  private xConstraint_: number[]
  private groupConstraint_: number[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(initialData?: any[][]) {
    this.yConstraint_ = Array(MAX_COUNT)
    fillArray(this.yConstraint_, '')

    this.xConstraint_ = Array(MAX_COUNT)
    fillArray(this.xConstraint_, '')

    this.groupConstraint_ = Array(MAX_COUNT)
    fillArray(this.groupConstraint_, '')

    if (initialData !== undefined) {
      for (let y = 0; y < MAX_COUNT; y++) {
        for (let x = 0; x < MAX_COUNT; x++) {
          if (initialData[y][x] > 0) {
            this.addData(new Cell(y, x), initialData[y][x])
          }
        }
      }
    }
  }

  public addData(cell: Cell, number: number): void {
    this.yConstraint_[cell.y()] |= 2 ** (number - 1)
    this.xConstraint_[cell.x()] |= 2 ** (number - 1)
    this.groupConstraint_[cell.group()] |= 2 ** (number - 1)
  }

  public getAvailableNumbers(cell: Cell): number[] {
    const Constraints =
      this.yConstraint_[cell.y()] |
      this.xConstraint_[cell.x()] |
      this.groupConstraint_[cell.group()]

    let numbers: number[] = []

    for (let num = 1; num <= MAX_COUNT; num++) {
      const numBit = 2 ** (num - 1)
      if ((Constraints & numBit) === 0) {
        numbers.push(num)
      }
    }

    return numbers
  }

  public getDataForDebug(): string[][] | number[][] {
    //0列目、0行目はヘッダーのイメージ。それに、内容用の1～9行目、1～9列目を確保
    const MAX_COUNT_FOR_GETDATA = MAX_COUNT + 1

    let Ret = new Array(MAX_COUNT_FOR_GETDATA)

    for (let y = 0; y < MAX_COUNT_FOR_GETDATA; y++) {
      Ret[y] = new Array(MAX_COUNT_FOR_GETDATA)
      fillArray(Ret[y], '')
    }

    //行の制約を出力
    for (let y = 0; y < MAX_COUNT; y++) {
      Ret[y + 1][0] = this.yConstraint_[y]
    }

    //列の制約を出力
    for (let x = 0; x < MAX_COUNT; x++) {
      Ret[0][x + 1] = this.xConstraint_[x]
    }

    //グループの制約を出力
    for (let group = 0; group < MAX_COUNT; group++) {
      const y = Math.floor(group / 3)
      const x = group - y * 3
      Ret[1 + y * 3][1 + x * 3] = this.groupConstraint_[group]
    }

    return Ret
  }
}

class Matrix {
  private data_: string[][] | number[][]

  private constraint_: Constraint
  private LastSearchedCell_: Cell

  public constructor(
    initialData?: string[][] | number[][],
    LastSearchedCell: Cell = new Cell(MAX_COUNT - 1, MAX_COUNT - 1)
  ) {
    if (initialData === undefined) {
      this.data_ = new Array(MAX_COUNT)
      for (let i = 0; i < MAX_COUNT; i++) {
        this.data_[i] = new Array(MAX_COUNT)
      }
    } else {
      if (initialData.length != MAX_COUNT) {
        throw new Error(
          `Matrix作成時の1次元目の配列の長さ ${
            initialData.length
          } が正しくありません`
        )
      }

      for (let i = 1; i < MAX_COUNT; i++) {
        if (initialData[i].length != MAX_COUNT) {
          throw new Error(
            `Matrix作成時のinitialdata[${i}]の2次元目の配列の長さ ${
              initialData[i].length
            } が正しくありません`
          )
        }
      }

      //配列のディープコピー
      this.data_ = JSON.parse(JSON.stringify(initialData))
    }

    this.constraint_ = new Constraint(this.data_)
    this.LastSearchedCell_ = LastSearchedCell
  }

  public addData(cell: Cell, number: number): void {
    this.data_[cell.y()][cell.x()] = number
    this.constraint_.addData(cell, number)
  }

  public BlankCellCount(): number {
    /*
    const Arr = this.data_.reduce((prev, cur) => {
      prev.push(...cur)
      return prev
    }, [])

    return Arr.filter(
      (ele): boolean => {
        return ele === ''
      }
    ).length
*/
    let count = 0
    for (let y = 0; y < MAX_COUNT; y++) {
      for (let x = 0; x < MAX_COUNT; x++) {
        if (this.data_[y][x] === '') {
          count++
        }
      }
    }
    return count
  }

  public getNextCellAndNumbers(): { cell: Cell; availableNumbers: number[] } {
    let y = this.LastSearchedCell_.y()
    let x = this.LastSearchedCell_.x()

    // eslint-disable-next-line no-constant-condition
    while (true) {
      x++

      if (x >= MAX_COUNT) {
        y += 1
        x = 0
      }

      if (y >= MAX_COUNT) {
        y = 0
      }

      if (
        y === this.LastSearchedCell_.y() &&
        x === this.LastSearchedCell_.x()
      ) {
        //入力可能なマスが見つからなかった
        break
      }

      if (this.data_[y][x] === '') {
        const targetCell = new Cell(y, x)
        this.LastSearchedCell_ = targetCell
        const availableNums: number[] = this.constraint_.getAvailableNumbers(
          targetCell
        )
        if (availableNums.length > 0) {
          return { cell: targetCell, availableNumbers: availableNums }
        } else {
          //入力可能なマスが見つからなかった
          break
        }
      }
    }

    return { cell: this.LastSearchedCell_, availableNumbers: [] }
  }

  public getData(): string[][] | number[][] {
    return this.data_
  }

  public getLastSearchedCell(): Cell {
    return this.LastSearchedCell_
  }
}

class SuudokuSolver {
  private records_: Matrix[]
  private nextStep_: Step[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(initialData: any[][]) {
    if (initialData.length != MAX_COUNT) {
      throw new Error(
        `Matrix作成時の1次元目の配列の長さ ${
          initialData.length
        } が正しくありません`
      )
    }

    for (let i = 1; i < MAX_COUNT; i++) {
      if (initialData[i].length != MAX_COUNT) {
        throw new Error(
          `Matrix作成時のinitialdata[${i}]の2次元目の配列の長さ ${
            initialData[i].length
          } が正しくありません`
        )
      }
    }

    this.records_ = []
    this.records_[0] = new Matrix(initialData)

    this.nextStep_ = []
  }

  public solve(recordNo: number = 0, displayCallback): boolean {
    if (this.records_[recordNo].BlankCellCount() === 0) {
      sheet.getRange(1, 11, 9, 9).setValues(this.records_[recordNo].getData())
      return true
    }

    let next = this.records_[recordNo].getNextCellAndNumbers()

    if (next.availableNumbers.length === 0) {
      return false
    }

    //画面描画
    //displayCallback(this.records_[recordNo].getData())
    sheet.getRange(1, 11, 9, 9).setValues(this.records_[recordNo].getData())

    for (let i = 0; i < next.availableNumbers.length; i++) {
      //    next.availableNumbers.forEach(nextNumber => {
      //    });

      //今回の手を記録
      this.nextStep_[recordNo] = new Step(next.cell, next.availableNumbers[i])

      //次の盤面を作成
      const nextRecordNo = recordNo + 1

      this.records_[nextRecordNo] = new Matrix(
        this.records_[recordNo].getData(),
        this.records_[recordNo].getLastSearchedCell()
      )
      this.records_[nextRecordNo].addData(next.cell, next.availableNumbers[i])

      const ret = this.solve(nextRecordNo, displayCallback)

      if (ret === true) {
        return true
      }
    }
    return false
  }

  public getData(): string[][] | number[][] {
    return this.records_[this.records_.length].getData()
  }

  public getSteps(): Step[] {
    return this.nextStep_
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function main(): void {
  const solver = new SuudokuSolver(sheet.getRange(1, 1, 9, 9).getValues())

  const solved = solver.solve(0, displayMatrix)
  //  sheet.getRange(1,11,9,9).setValues(solver.getData())

  if (solved) {
    sheet.getRange('K11').setValue('解けました！')
  } else {
    sheet.getRange('K11').setValue('解けませんでした！')
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function test(): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = sheet.getRange(1, 1, 9, 9).getValues()
}

/*
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function testConstraint(): void {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    'testConstraintInit'
  )
  const c = new Constraint(sheet.getRange(2, 2, 9, 9).getValues())
  sheet.getRange(1, 12, 10, 10).setValues(c.getDataForDebug())
}


function testNextCell() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("testMatrixInit")
  const m = new Matrix(sheet.getRange(1,1,9,9).getValues())
  sheet.getRange(1,11,9,9).setValues(m.getData())

  for (let row=15;row<80;row++) {
    let CellAndNumbers = m.getNextCellAndNumbers()
    sheet.getRange(row,1).setValue(CellAndNumbers.cell.x())
    sheet.getRange(row,2).setValue(CellAndNumbers.cell.y())
    sheet.getRange(row,3).setValue(CellAndNumbers.availableNumbers.toString())
  }
  
}


function testBlankCellCount() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("testMatrixInit")
  const m = new Matrix(sheet.getRange(1,1,9,9).getValues())
  sheet.getRange(1,11,9,9).setValues(m.getData())

  sheet.getRange(13,2).setValue(m.BlankCellCount())
  
}

function testMatrix() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("testMatrixInit")
  const m = new Matrix(sheet.getRange(1,1,9,9).getValues())
  sheet.getRange(1,11,9,9).setValues(m.getData())
}

function testCellInitialization() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("testCellInitilization")

  for (let y:number=0;y<=8;y++) {
    for (let x:number=0;x<=8;x++) {
       const c = new Cell(y,x)
       sheet.getRange(y+1, x+1).setValue(c.x() )
       sheet.getRange(y+1, x+1 + 10).setValue(c.y() )
       sheet.getRange(y+1, x+1 + 20).setValue(c.group() )
    }
  }
}
*/
