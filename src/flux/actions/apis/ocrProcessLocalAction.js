import C from '../constants';


export const OcrProcessLocal = (data) => {
    return {
        type: C.OCR_PROCESS_LOCAL,
        payload: data
    };
};