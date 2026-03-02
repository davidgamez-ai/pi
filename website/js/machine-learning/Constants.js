//Box where logging information is displayed to user
export const INFO_BOX_ID = "ML-InfoBox";
//IDs of graph divs
export const DATA_GRAPH_DIV = "DataGraphDiv";
export const BATCH_LOSS_GRAPH_DIV = "BatchLossGraphDiv";
export const EPOCH_LOSS_GRAPH_DIV = "EpochLossGraphDiv";
export const PREDICTION_MATCH_GRAPH_DIV = "PredictionMatchGraphDiv";
export const CRYSTALLIZED_INTELLIGENCE_GRAPH_DIV = "ML-CrystallizedIntelligenceGraphDiv";
export const FLUID_INTELLIGENCE_GRAPH_DIV = "ML-FluidIntelligenceGraphDiv";
export const PREDICTION_PROBABILITY_GRAPH_DIV = "PredictionProbabilityGraphDiv";
//Data controls
export const DATA_SELECT = "DataSelect";
export const SELECT_DATA_SETS_BUTTON = "SelectDataSetsButton";
export const DATA_SET_SELECTION_MODAL = "DataSetSelectionModal";
export const CLOSE_DATA_SELECT_BUTTON = "CloseDataSelectButton";
export const MODAL_DATA_SET_LIST = "ModalDataSetList";
export const DATA_SPLIT_SLIDER = "DataSplitSlider";
export const TIME_WINDOW_INPUT = "TimeWindowInput";
export const TRAIN_PERCENT_INPUT = "TrainPercentInput";
export const VALIDATION_PERCENT_INPUT = "ValidationPercentInput";
export const TEST_PERCENT_INPUT = "TestPercentInput";
//Model inputs and controls
export const NUM_MODELS_INPUT = "NumModelsInput";
export const LSTM_UNITS_INPUT = "LSTMUnitsInput";
export const CLEAR_TRAINING_BUTTON = "ClearTrainingButton";
//Training inputs and controls
export const BATCH_SIZE_INPUT = "BatchSizeInput";
export const EPOCH_INPUT = "EpochInput";
export const TRAINING_CYCLES_INPUT = "TrainingCyclesInput";
export const START_TRAINING_BUTTON = "StartTrainingButton";
export const STOP_TRAINING_BUTTON = "StopTrainingButton";
//Intelligence input and display
export const COMPRESSIBILITY_MODAL = "CompressibilityModal";
export const TOTAL_COMPRESSIBILITY_SPAN = "TotalCompressibility";
export const DATA_SET_COMPRESSIBILITY_DIV = "DataSetCompressibility";
export const CLOSE_COMPRESSIBILITY_MODAL_BUTTON = "CloseCompressibilityButton";
export const SHOW_COMPRESSIBILITY_MODAL_BUTTON = "ShowCompressibilityButton";
export const P_VALUE_SELECT = "PValueSelect";
//Builds and resets data and model.
export const BUILD_BUTTON = "BuildButton";
export const RESET_BUTTON = "ResetButton";
/* Fluid intelligence is the derivative of crystallized intelligence.
    It is calculated by taking a polynomial approximation to crystallized
    intelligence and then calculating the slope at each point.
    The polynomial window specifies the size of the window (plus and minus the point)
    for this calculation.
*/
export const POLYNOMIAL_WINDOW_DEFAULT = 5;
export const RECALCULATE_INTELLIGENCE_BUTTON = "RecalculateIntelligenceButton";
//Plot controls
export const PLOT_CI_INDIVIDUAL_DATASETS_CB = "PlotCIIndividualDataSetsCheckBox";
export const CLEAR_GRAPH_SELECTION_BUTTON = "ClearMLGraphSelectionButton";
export const PLOT_BATCH_LOSS_CB = "PlotBatchLossCheckBox";
