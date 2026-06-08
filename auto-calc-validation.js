/**
 * ========================================
 * 1. 자동 계산 기능 (AUTO CALCULATION)
 * ========================================
 */

/**
 * 공급가액 입력 시 자동으로 부가세(10%) 및 합계 계산
 * @param {number} rowIndex - 테이블 행 인덱스
 * @param {number} supplyAmount - 공급가액
 */
function autoCalcTaxAndTotal(rowIndex, supplyAmount) {
    const supply = parseFloat(supplyAmount) || 0;
    
    // 1. 부가세 자동 계산 (10%)
    const tax = Math.round(supply * 0.1);
    
    // 2. 결제금액 자동 계산 (공급가액 + 부가세)
    const total = supply + tax;
    
    // DOM 업데이트
    const taxInput = document.querySelector(`#row-${rowIndex} [data-field="tax"]`);
    const totalInput = document.querySelector(`#row-${rowIndex} [data-field="total"]`);
    
    if (taxInput) taxInput.value = formatCurrency(tax);
    if (totalInput) totalInput.value = formatCurrency(total);
    
    // 3. 지급요청금액 자동 재계산
    autoCalcRequestAmount(rowIndex);
    
    // 4. 합계 행(tfoot) 업데이트
    updateStatementTotals();
}

/**
 * 지급요청금액 자동 계산 (결제금액 - 공제 - 선지급)
 * @param {number} rowIndex - 테이블 행 인덱스
 */
function autoCalcRequestAmount(rowIndex) {
    const totalInput = document.querySelector(`#row-${rowIndex} [data-field="total"]`);
    const deductionInput = document.querySelector(`#row-${rowIndex} [data-field="deduction"]`);
    const prepaidInput = document.querySelector(`#row-${rowIndex} [data-field="prepaid"]`);
    const requestInput = document.querySelector(`#row-${rowIndex} [data-field="request"]`);
    
    if (!totalInput || !requestInput) return;
    
    const total = parseFloat(totalInput.value) || 0;
    const deduction = parseFloat(deductionInput?.value) || 0;
    const prepaid = parseFloat(prepaidInput?.value) || 0;
    
    const requestAmount = total - deduction - prepaid;
    
    if (requestInput) requestInput.value = formatCurrency(Math.max(0, requestAmount));
    
    updateStatementTotals();
}

/**
 * 통화 형식으로 변환 (콤마 추가)
 * @param {number} value - 변환할 값
 * @returns {string} 포맷된 문자열
 */
function formatCurrency(value) {
    return value.toLocaleString('ko-KR');
}

/**
 * 통화 형식 제거 (숫자만 추출)
 * @param {string} value - 포맷된 문자열
 * @returns {number} 숫자
 */
function parseCurrency(value) {
    return parseFloat(value.toString().replace(/[^0-9.-]/g, '')) || 0;
}

/**
 * 전체 합계 행(tfoot) 업데이트
 */
function updateStatementTotals() {
    const tbody = document.querySelector('#statement-tbody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr[data-row-id]');
    let totalSupply = 0;
    let totalTax = 0;
    let totalCalc = 0;
    let totalDeduction = 0;
    let totalPrepaid = 0;
    let totalRequest = 0;
    
    rows.forEach(row => {
        const supply = parseCurrency(row.querySelector('[data-field="supply"]')?.value || 0);
        const tax = parseCurrency(row.querySelector('[data-field="tax"]')?.value || 0);
        const total = parseCurrency(row.querySelector('[data-field="total"]')?.value || 0);
        const deduction = parseCurrency(row.querySelector('[data-field="deduction"]')?.value || 0);
        const prepaid = parseCurrency(row.querySelector('[data-field="prepaid"]')?.value || 0);
        const request = parseCurrency(row.querySelector('[data-field="request"]')?.value || 0);
        
        totalSupply += supply;
        totalTax += tax;
        totalCalc += total;
        totalDeduction += deduction;
        totalPrepaid += prepaid;
        totalRequest += request;
    });
    
    // tfoot 업데이트
    const tfoot = document.querySelector('#statement-master-table tfoot');
    if (tfoot) {
        document.getElementById('foot-supply').textContent = formatCurrency(totalSupply);
        document.getElementById('foot-tax').textContent = formatCurrency(totalTax);
        document.getElementById('foot-total-calc').textContent = formatCurrency(totalCalc);
        document.getElementById('foot-deduction').textContent = formatCurrency(totalDeduction);
        document.getElementById('foot-prepaid').textContent = formatCurrency(totalPrepaid);
        document.getElementById('foot-request-amt').textContent = formatCurrency(totalRequest);
    }
}

/**
 * ========================================
 * 2. 데이터 유효성 검증 (VALIDATION)
 * ========================================
 */

/**
 * 행 전체 검증
 * @param {number} rowIndex - 테이블 행 인덱스
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateRow(rowIndex) {
    const errors = [];
    const row = document.querySelector(`#row-${rowIndex}`);
    
    if (!row) return { isValid: false, errors: ['행을 찾을 수 없습니다'] };
    
    // 1. 거래처명 검증
    const vendor = row.querySelector('[data-field="vendor"]')?.value?.trim();
    if (!vendor) {
        errors.push('거래처명은 필수입니다');
    }
    
    // 2. 대표자 검증
    const representative = row.querySelector('[data-field="representative"]')?.value?.trim();
    if (!representative) {
        errors.push('대표자명은 필수입니다');
    }
    
    // 3. 공급가액 검증
    const supply = parseCurrency(row.querySelector('[data-field="supply"]')?.value || 0);
    if (supply < 0) {
        errors.push('공급가액은 0 이상이어야 합니다');
    }
    if (supply === 0) {
        errors.push('공급가액을 입력해주세요');
    }
    
    // 4. 부가세 검증
    const tax = parseCurrency(row.querySelector('[data-field="tax"]')?.value || 0);
    const expectedTax = Math.round(supply * 0.1);
    if (Math.abs(tax - expectedTax) > 1) {
        errors.push(`부가세가 올바르지 않습니다 (예상: ${formatCurrency(expectedTax)}원)`);
    }
    
    // 5. 공제금액 검증
    const deduction = parseCurrency(row.querySelector('[data-field="deduction"]')?.value || 0);
    const total = parseCurrency(row.querySelector('[data-field="total"]')?.value || 0);
    if (deduction > total) {
        errors.push('공제금액이 결제금액을 초과합니다');
    }
    if (deduction < 0) {
        errors.push('공제금액은 0 이상이어야 합니다');
    }
    
    // 6. 선지급 검증
    const prepaid = parseCurrency(row.querySelector('[data-field="prepaid"]')?.value || 0);
    if (prepaid > total) {
        errors.push('선지급액이 결제금액을 초과합니다');
    }
    if (prepaid < 0) {
        errors.push('선지급액은 0 이상이어야 합니다');
    }
    
    // 7. 지급요청금액 검증
    const request = parseCurrency(row.querySelector('[data-field="request"]')?.value || 0);
    const expectedRequest = total - deduction - prepaid;
    if (Math.abs(request - expectedRequest) > 1) {
        errors.push('지급요청금액이 올바르지 않습니다');
    }
    
    // 8. 은행/계좌 검증
    const bank = row.querySelector('[data-field="bank"]')?.value?.trim();
    const account = row.querySelector('[data-field="account"]')?.value?.trim();
    if (!bank || !account) {
        errors.push('은행과 계좌정보는 필수입니다');
    }
    
    // 9. 중복 검증 (같은 거래처, 같은 금액)
    if (vendor && supply > 0) {
        const isDuplicate = checkDuplicate(vendor, supply, rowIndex);
        if (isDuplicate) {
            errors.push('⚠️ 동일한 거래처와 공급가액이 이미 존재합니다');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * 중복 청구 감지
 * @param {string} vendor - 거래처명
 * @param {number} supply - 공급가액
 * @param {number} excludeRowIndex - 제외할 행 인덱스
 * @returns {boolean} 중복 여부
 */
function checkDuplicate(vendor, supply, excludeRowIndex = -1) {
    const tbody = document.querySelector('#statement-tbody');
    if (!tbody) return false;
    
    const rows = tbody.querySelectorAll('tr[data-row-id]');
    
    for (let row of rows) {
        const rowIndex = parseInt(row.dataset.rowId);
        if (rowIndex === excludeRowIndex) continue;
        
        const rowVendor = row.querySelector('[data-field="vendor"]')?.value?.trim();
        const rowSupply = parseCurrency(row.querySelector('[data-field="supply"]')?.value || 0);
        
        if (rowVendor === vendor && rowSupply === supply) {
            return true;
        }
    }
    
    return false;
}

/**
 * 전체 테이블 검증 및 오류 표시
 * @returns {boolean} 모든 행이 유효한지 여부
 */
function validateAllRows() {
    const tbody = document.querySelector('#statement-tbody');
    if (!tbody) return true;
    
    const rows = tbody.querySelectorAll('tr[data-row-id]');
    let hasErrors = false;
    let totalErrors = [];
    
    rows.forEach((row, index) => {
        const rowIndex = row.dataset.rowId;
        const { isValid, errors } = validateRow(rowIndex);
        
        if (!isValid) {
            hasErrors = true;
            row.classList.add('bg-red-50', 'dark:bg-red-950');
            totalErrors.push(`행 ${index + 1}: ${errors.join(', ')}`);
        } else {
            row.classList.remove('bg-red-50', 'dark:bg-red-950');
        }
    });
    
    // 에러 표시
    if (hasErrors) {
        showValidationErrors(totalErrors);
    } else {
        showSuccess('모든 데이터가 유효합니다 ✓');
    }
    
    return !hasErrors;
}

/**
 * 검증 오류 표시
 * @param {array} errors - 오류 메시지 배열
 */
function showValidationErrors(errors) {
    const alertBanner = document.createElement('div');
    alertBanner.className = 'fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r z-50 max-w-md';
    
    let html = '<div class="font-bold mb-2">⚠️ 검증 오류:</div><ul class="text-sm space-y-1">';
    errors.forEach(err => {
        html += `<li>• ${err}</li>`;
    });
    html += '</ul>';
    
    alertBanner.innerHTML = html;
    document.body.appendChild(alertBanner);
    
    setTimeout(() => alertBanner.remove(), 5000);
}

/**
 * 성공 메시지 표시
 * @param {string} message - 메시지
 */
function showSuccess(message) {
    const successBanner = document.createElement('div');
    successBanner.className = 'fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-r z-50';
    successBanner.textContent = message;
    document.body.appendChild(successBanner);
    
    setTimeout(() => successBanner.remove(), 3000);
}

/**
 * ========================================
 * 3. 감시 추적 (AUDIT TRAIL)
 * ========================================
 */

/**
 * 감시 로그 저장소 (localStorage에 저장)
 */
class AuditTrail {
    constructor(documentId) {
        this.documentId = documentId;
        this.storageKey = `audit-${documentId}`;
        this.logs = this.loadLogs();
    }
    
    /**
     * 로그 로드
     */
    loadLogs() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('감시 로그 로드 실패:', e);
            return [];
        }
    }
    
    /**
     * 로그 저장
     */
    saveLogs() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
        } catch (e) {
            console.error('감시 로그 저장 실패:', e);
        }
    }
    
    /**
     * 새 로그 추가
     * @param {string} action - 작업 (생성, 수정, 삭제 등)
     * @param {object} changes - 변경 사항 { field, before, after }
     * @param {string} user - 사용자명
     */
    log(action, changes = {}, user = '사용자') {
        const entry = {
            timestamp: new Date().toISOString(),
            datetime: new Date().toLocaleString('ko-KR'),
            action: action,
            user: user,
            changes: changes
        };
        
        this.logs.push(entry);
        this.saveLogs();
        
        console.log('🔍 감시 로그:', entry);
    }
    
    /**
     * 수정 로그 (before/after 추적)
     * @param {string} field - 필드명
     * @param {any} before - 변경 전 값
     * @param {any} after - 변경 후 값
     * @param {string} user - 사용자명
     */
    logChange(field, before, after, user = '사용자') {
        if (before === after) return; // 변화 없으면 로그하지 않음
        
        this.log('수정', {
            field: field,
            before: before,
            after: after
        }, user);
    }
    
    /**
     * 삭제 로그
     * @param {string} itemName - 삭제된 항목명
     * @param {object} data - 삭제된 데이터
     * @param {string} user - 사용자명
     */
    logDelete(itemName, data, user = '사용자') {
        this.log('삭제', {
            item: itemName,
            data: data
        }, user);
    }
    
    /**
     * 모든 로그 조회
     */
    getLogs() {
        return this.logs;
    }
    
    /**
     * 특정 날짜 로그 조회
     * @param {string} date - 날짜 (YYYY-MM-DD)
     */
    getLogsByDate(date) {
        return this.logs.filter(log => log.datetime.startsWith(date));
    }
    
    /**
     * 로그 내보내기 (JSON)
     */
    exportLogs() {
        const data = {
            documentId: this.documentId,
            exportDate: new Date().toISOString(),
            logs: this.logs
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-trail-${this.documentId}-${new Date().getTime()}.json`;
        link.click();
    }
    
    /**
     * 로그 표시 UI 생성
     */
    showLogsModal() {
        const modal = document.createElement('div');
        modal.id = 'audit-trail-modal';
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        
        let html = `
            <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-96 overflow-auto">
                <div class="sticky top-0 bg-slate-100 dark:bg-slate-800 p-4 border-b flex justify-between items-center">
                    <h3 class="font-bold text-lg">📋 감시 로그 (총 ${this.logs.length}건)</h3>
                    <div class="flex gap-2">
                        <button onclick="auditTrail.exportLogs()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold">
                            JSON 내보내기
                        </button>
                        <button onclick="document.getElementById('audit-trail-modal').remove()" class="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded text-xs font-bold">
                            닫기
                        </button>
                    </div>
                </div>
                <table class="w-full text-xs">
                    <thead class="bg-slate-50 dark:bg-slate-800 border-b">
                        <tr>
                            <th class="text-left px-4 py-2 font-bold">시간</th>
                            <th class="text-left px-4 py-2 font-bold">작업</th>
                            <th class="text-left px-4 py-2 font-bold">사용자</th>
                            <th class="text-left px-4 py-2 font-bold">변경 사항</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
        `;
        
        this.logs.forEach(log => {
            const changeText = log.changes.field 
                ? `${log.changes.field}: ${log.changes.before} → ${log.changes.after}`
                : JSON.stringify(log.changes);
            
            html += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td class="px-4 py-2 text-slate-500">${log.datetime}</td>
                    <td class="px-4 py-2 font-semibold">${log.action}</td>
                    <td class="px-4 py-2">${log.user}</td>
                    <td class="px-4 py-2 text-slate-600 dark:text-slate-300">${changeText}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);
    }
}

// 전역 감시 객체 생성 (현재 문서 기준)
let auditTrail = null;

/**
 * 감시 추적 초기화
 * @param {string} documentId - 문서 ID (예: "202606_경산개발")
 */
function initAuditTrail(documentId) {
    auditTrail = new AuditTrail(documentId);
    auditTrail.log('생성', {}, '시스템');
}

/**
 * ========================================
 * 4. 통합 이벤트 핸들러
 * ========================================
 */

/**
 * 공급가액 입력 이벤트
 */
document.addEventListener('input', function(e) {
    if (e.target.dataset.field === 'supply') {
        const rowId = e.target.closest('tr')?.dataset.rowId;
        if (rowId) {
            autoCalcTaxAndTotal(rowId, e.target.value);
            
            // 감시 로그 기록
            if (auditTrail) {
                auditTrail.logChange('공급가액', e.target.dataset.oldValue, e.target.value);
            }
            e.target.dataset.oldValue = e.target.value;
        }
    }
});

/**
 * 공제/선지급 입력 이벤트
 */
document.addEventListener('input', function(e) {
    if (e.target.dataset.field === 'deduction' || e.target.dataset.field === 'prepaid') {
        const rowId = e.target.closest('tr')?.dataset.rowId;
        if (rowId) {
            autoCalcRequestAmount(rowId);
            
            // 감시 로그 기록
            if (auditTrail) {
                auditTrail.logChange(e.target.dataset.field, e.target.dataset.oldValue, e.target.value);
            }
            e.target.dataset.oldValue = e.target.value;
        }
    }
});

/**
 * 행 저장 이벤트
 */
function saveRow(rowIndex) {
    const validation = validateRow(rowIndex);
    
    if (!validation.isValid) {
        showValidationErrors(validation.errors);
        return false;
    }
    
    // 감시 로그 기록
    if (auditTrail) {
        auditTrail.log('저장', { rowIndex: rowIndex }, '사용자');
    }
    
    showSuccess('행이 저장되었습니다 ✓');
    return true;
}

/**
 * 행 삭제 이벤트
 */
function deleteRow(rowIndex) {
    const row = document.querySelector(`#row-${rowIndex}`);
    if (!row) return false;
    
    const vendor = row.querySelector('[data-field="vendor"]')?.value;
    const supply = row.querySelector('[data-field="supply"]')?.value;
    
    if (confirm(`"${vendor}" 항목을 삭제하시겠습니까?`)) {
        // 감시 로그 기록
        if (auditTrail) {
            auditTrail.logDelete('청구 항목', { vendor, supply }, '사용자');
        }
        
        row.remove();
        updateStatementTotals();
        showSuccess('항목이 삭제되었습니다');
        return true;
    }
    
    return false;
}

/**
 * 감시 로그 조회 버튼 추가
 */
function addAuditTrailButton() {
    const header = document.querySelector('header');
    if (!header) return;
    
    const button = document.createElement('button');
    button.onclick = () => auditTrail?.showLogsModal();
    button.className = 'bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium text-xs flex items-center gap-1 transition-all';
    button.innerHTML = '<i data-lucide="history" class="w-3.5 h-3.5"></i> 감시 로그';
    
    const printButton = document.querySelector('button:has([data-lucide="printer"])');
    if (printButton) {
        printButton.parentNode.insertBefore(button, printButton);
    }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 감시 추적 초기화
    const docTitle = document.getElementById('doc-title')?.value || '새로운_청구서';
    initAuditTrail(docTitle.replace(/\s+/g, '_'));
    
    // 감시 로그 버튼 추가
    addAuditTrailButton();
    
    // 기존 합계 업데이트 함수 연결
    updateStatementTotals();
});

// 내보내기 (모듈 패턴)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        autoCalcTaxAndTotal,
        autoCalcRequestAmount,
        validateRow,
        validateAllRows,
        checkDuplicate,
        AuditTrail,
        initAuditTrail
    };
}
