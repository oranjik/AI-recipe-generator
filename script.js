// AI Recipe Chef - JavaScript 기능
class RecipeApp {
    constructor() {
        this.currentScreen = 'landing';
        this.recipeCount = 0;
        this.maxFreeRecipes = 3;
        this.isGenerating = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupRippleEffects();
        this.updateFreeLimit();
    }

    setupEventListeners() {
        // 네비게이션 및 버튼 클릭 이벤트
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // 화면 전환 버튼
            if (target.hasAttribute('data-screen')) {
                const screenId = target.getAttribute('data-screen');
                this.showScreen(screenId);
            }
            
            // 페이월 닫기
            if (target.classList.contains('close-paywall')) {
                this.hidePaywall();
            }
            
            // 저장 버튼 (페이월 표시)
            if (target.classList.contains('save-recipe-btn')) {
                this.showPaywall();
            }
        });

        // 폼 제출 이벤트
        const recipeForm = document.getElementById('recipeForm');
        if (recipeForm) {
            recipeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateRecipe();
            });
        }

        // 페이월 내 업그레이드 버튼
        document.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-screen') && e.target.closest('.paywall')) {
                this.hidePaywall();
                this.showScreen(e.target.getAttribute('data-screen'));
            }
        });
    }

    showScreen(screenId) {
        if (this.isGenerating) return;

        // 현재 활성 화면에 페이드아웃 애니메이션 적용
        const currentScreenEl = document.querySelector('.screen.active');
        if (currentScreenEl) {
            currentScreenEl.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => {
                currentScreenEl.classList.remove('active');
                currentScreenEl.style.animation = '';
            }, 300);
        }

        // 새 화면 표시
        setTimeout(() => {
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => screen.classList.remove('active'));

            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.classList.add('active');
                this.currentScreen = screenId;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 300);
    }

    async generateRecipe() {
        if (this.isGenerating) return;
        
        // 무료 제한 검사
        if (this.recipeCount >= this.maxFreeRecipes) {
            this.showPaywall();
            return;
        }

        // 폼 유효성 검사
        const ingredients = document.getElementById('ingredients').value.trim();
        if (!ingredients) {
            alert('재료를 입력해주세요!');
            return;
        }

        this.isGenerating = true;
        
        // 폼 데이터 수집
        const formData = this.getFormData();
        
        // 로딩 모달 표시
        this.showLoading();
        
        // 버튼 상태 변경
        const submitBtn = document.querySelector('#recipeForm .cta-button');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '🔮 AI가 레시피를 생성 중...';
        submitBtn.disabled = true;

        try {
            // 실제 API 호출 또는 프로토타입 레시피 생성
            let recipe;
            
            // 백엔드 API 사용 가능한 경우
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                try {
                    recipe = await this.callRecipeAPI(formData);
                } catch (apiError) {
                    console.warn('API 호출 실패, 프로토타입 레시피 사용:', apiError);
                    recipe = this.createPrototypeRecipe(formData);
                }
            } else {
                // 프로토타입용 레시피 생성
                recipe = this.createPrototypeRecipe(formData);
            }
            
            // 결과 화면에 레시피 표시
            this.displayRecipe(recipe);
            
            // 추천 상품 표시
            this.displayProducts();
            
            this.recipeCount++;
            this.updateFreeLimit();
            
            // 결과 화면으로 전환
            this.showScreen('result');
            
        } catch (error) {
            console.error('레시피 생성 중 오류:', error);
            alert('레시피 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            this.hideLoading();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            this.isGenerating = false;
        }
    }

    async callRecipeAPI(formData) {
        const response = await fetch('/api/recipe/generate-recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 인증 토큰이 있다면 추가
                ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            if (response.status === 429) {
                const errorData = await response.json();
                if (errorData.upgradeUrl) {
                    this.showPaywall();
                    return;
                }
                throw new Error('일일 레시피 생성 한도에 도달했습니다.');
            }
            throw new Error('API 호출에 실패했습니다.');
        }

        const data = await response.json();
        return data.recipe;
    }

    getFormData() {
        return {
            ingredients: document.getElementById('ingredients').value.trim(),
            cuisine: document.getElementById('cuisine').value,
            cookingTime: document.getElementById('cookingTime').value,
            dietary: document.getElementById('dietary').value,
            skillLevel: document.getElementById('skillLevel').value
        };
    }

    async simulateAIProcessing() {
        return new Promise(resolve => {
            setTimeout(resolve, 1500 + Math.random() * 1000);
        });
    }

    createPrototypeRecipe(formData) {
        // 사용자 재료 분석
        const userIngredients = this.parseIngredients(formData.ingredients);
        
        // 재료 기반으로 레시피 템플릿 선택
        const recipes = this.getRecipeTemplates();
        let selectedRecipe;

        // 요리 유형이 지정된 경우
        if (formData.cuisine && recipes[formData.cuisine]) {
            const cuisineRecipes = recipes[formData.cuisine];
            selectedRecipe = cuisineRecipes[Math.floor(Math.random() * cuisineRecipes.length)];
        } else {
            // 재료를 기반으로 가장 적합한 레시피 찾기
            selectedRecipe = this.findBestMatchingRecipe(userIngredients, recipes);
        }
        
        // 사용자 재료와 설정을 기반으로 레시피 커스터마이징
        const customizedRecipe = this.customizeRecipe(selectedRecipe, formData, userIngredients);
        
        return customizedRecipe;
    }

    parseIngredients(ingredientsString) {
        return ingredientsString
            .toLowerCase()
            .split(/[,\n]/)
            .map(ingredient => ingredient.trim())
            .filter(ingredient => ingredient.length > 0);
    }

    findBestMatchingRecipe(userIngredients, recipes) {
        const allRecipes = [
            ...recipes.korean,
            ...recipes.italian,
            ...recipes.asian,
            ...recipes.default
        ];

        let bestMatch = allRecipes[0];
        let bestScore = 0;

        allRecipes.forEach(recipe => {
            let score = 0;
            const recipeIngredients = recipe.ingredients.join(' ').toLowerCase();
            
            userIngredients.forEach(userIngredient => {
                if (recipeIngredients.includes(userIngredient)) {
                    score++;
                }
            });

            if (score > bestScore) {
                bestScore = score;
                bestMatch = recipe;
            }
        });

        return bestMatch;
    }

    getRecipeTemplates() {
        return {
            korean: [
                {
                    name: "김치볶음밥",
                    description: "매콤하고 고소한 한국의 대표 볶음밥",
                    prepTime: "10분",
                    cookTime: "15분",
                    totalTime: "25분",
                    servings: "2인분",
                    difficulty: "easy",
                    ingredients: [
                        "밥 2공기",
                        "김치 1컵",
                        "돼지고기 100g",
                        "달걀 2개",
                        "파 2대",
                        "마늘 2쪽",
                        "참기름 1큰술",
                        "간장 1큰술"
                    ],
                    instructions: [
                        "팬에 기름을 두르고 돼지고기를 볶아줍니다",
                        "김치를 넣고 함께 볶아줍니다",
                        "밥을 넣고 잘 섞어가며 볶아줍니다",
                        "간장으로 간을 맞추고 파를 넣습니다",
                        "달걀을 풀어서 넣고 골고루 섞어줍니다",
                        "참기름을 넣고 마무리합니다"
                    ],
                    tips: [
                        "김치는 잘 익은 것을 사용하세요",
                        "밥은 차가운 밥을 사용하면 더 맛있습니다"
                    ],
                    nutrition: {
                        calories: "약 520kcal",
                        protein: "25g",
                        carbs: "65g",
                        fat: "18g"
                    }
                },
                {
                    name: "된장찌개",
                    description: "구수하고 진한 된장의 맛",
                    prepTime: "15분",
                    cookTime: "20분",
                    totalTime: "35분",
                    servings: "3-4인분",
                    difficulty: "easy",
                    ingredients: [
                        "된장 3큰술",
                        "두부 1/2모",
                        "감자 1개",
                        "양파 1/2개",
                        "애호박 1/3개",
                        "청양고추 2개",
                        "마늘 3쪽",
                        "멸치육수 2컵"
                    ],
                    instructions: [
                        "멸치육수를 우려냅니다",
                        "감자와 양파를 큼직하게 썰어줍니다",
                        "끓는 육수에 된장을 풀어줍니다",
                        "감자와 양파를 넣고 끓입니다",
                        "두부와 애호박, 고추를 넣습니다",
                        "마늘과 파를 넣고 마무리합니다"
                    ],
                    tips: [
                        "된장은 체에 거르면 더 부드럽습니다",
                        "두부는 마지막에 넣어 부서지지 않게 하세요"
                    ],
                    nutrition: {
                        calories: "약 180kcal",
                        protein: "12g",
                        carbs: "15g",
                        fat: "8g"
                    }
                }
            ],
            italian: [
                {
                    name: "크림 파스타",
                    description: "부드럽고 진한 크림소스 파스타",
                    prepTime: "10분",
                    cookTime: "20분",
                    totalTime: "30분",
                    servings: "2인분",
                    difficulty: "easy",
                    ingredients: [
                        "파스타 200g",
                        "생크림 200ml",
                        "베이컨 100g",
                        "양파 1/2개",
                        "마늘 3쪽",
                        "파마산 치즈 50g",
                        "올리브오일 2큰술",
                        "소금, 후추 약간"
                    ],
                    instructions: [
                        "파스타를 소금물에 삶아줍니다",
                        "팬에 올리브오일을 두르고 베이컨을 볶습니다",
                        "양파와 마늘을 넣고 볶아줍니다",
                        "생크림을 넣고 끓어오르면 약불로 줄입니다",
                        "삶은 파스타를 넣고 잘 섞어줍니다",
                        "파마산 치즈와 후추를 넣고 마무리합니다"
                    ],
                    tips: [
                        "파스타는 알덴테로 삶으세요",
                        "크림은 끓이면 분리될 수 있으니 주의하세요"
                    ]
                },
                {
                    name: "토마토 파스타",
                    description: "신선한 토마토의 상큼한 맛",
                    prepTime: "15분",
                    cookTime: "25분",
                    totalTime: "40분",
                    servings: "2인분",
                    difficulty: "easy",
                    ingredients: [
                        "파스타 200g",
                        "토마토 캔 1개",
                        "양파 1개",
                        "마늘 4쪽",
                        "바질 잎 10장",
                        "올리브오일 3큰술",
                        "소금, 후추",
                        "파마산 치즈"
                    ],
                    instructions: [
                        "파스타를 삶기 시작합니다",
                        "양파와 마늘을 잘게 다져줍니다",
                        "팬에 올리브오일을 두르고 양파를 볶습니다",
                        "마늘을 넣고 향이 날 때까지 볶습니다",
                        "토마토 캔을 넣고 끓여줍니다",
                        "삶은 파스타와 바질을 넣고 섞습니다"
                    ],
                    tips: [
                        "토마토는 으깨가며 볶으면 더 진한 맛이 납니다",
                        "바질은 마지막에 넣어 향을 살리세요"
                    ]
                }
            ],
            asian: [
                {
                    name: "볶음면",
                    description: "간단하고 맛있는 아시안 볶음면",
                    prepTime: "10분",
                    cookTime: "15분",
                    totalTime: "25분",
                    servings: "2인분",
                    difficulty: "easy",
                    ingredients: [
                        "라면 2개",
                        "양배추 2잎",
                        "당근 1/2개",
                        "양파 1/2개",
                        "간장 2큰술",
                        "굴소스 1큰술",
                        "참기름 1큰술",
                        "식용유 2큰술"
                    ],
                    instructions: [
                        "면을 끓는 물에 살짝 삶아줍니다",
                        "야채들을 채 썰어 준비합니다",
                        "팬에 기름을 두르고 야채를 볶습니다",
                        "면을 넣고 함께 볶아줍니다",
                        "간장과 굴소스로 간을 맞춥니다",
                        "참기름을 넣고 마무리합니다"
                    ],
                    tips: [
                        "면은 너무 오래 삶지 마세요",
                        "강한 불에서 빠르게 볶는 것이 포인트입니다"
                    ]
                }
            ],
            mexican: [
                {
                    name: "치킨 부리또",
                    description: "매콤한 치킨과 신선한 야채의 조화",
                    prepTime: "20분",
                    cookTime: "15분",
                    totalTime: "35분",
                    servings: "2인분",
                    difficulty: "medium",
                    ingredients: [
                        "토르티야 4장",
                        "닭가슴살 300g",
                        "양파 1개",
                        "피망 1개",
                        "토마토 1개",
                        "치즈 100g",
                        "사워크림",
                        "타코 시즈닝"
                    ],
                    instructions: [
                        "닭가슴살을 먹기 좋은 크기로 자릅니다",
                        "야채들을 썰어 준비합니다",
                        "닭고기에 시즈닝을 발라 볶습니다",
                        "야채를 넣고 함께 볶아줍니다",
                        "토르티야에 재료들을 올립니다",
                        "말아서 완성합니다"
                    ],
                    tips: [
                        "토르티야는 살짝 데워서 사용하세요",
                        "속이 너무 많으면 말기 어려우니 적당히 넣으세요"
                    ]
                }
            ],
            default: [
                {
                    name: "닭가슴살 야채볶음",
                    description: "건강하고 담백한 고단백 요리",
                    prepTime: "10분",
                    cookTime: "15분",
                    totalTime: "25분",
                    servings: "2인분",
                    difficulty: "easy",
                    ingredients: [
                        "닭가슴살 200g",
                        "양파 1개",
                        "피망 2개",
                        "마늘 3쪽",
                        "간장 2큰술",
                        "올리브오일 2큰술",
                        "소금, 후추 약간"
                    ],
                    instructions: [
                        "닭가슴살을 한입 크기로 자릅니다",
                        "야채들을 적당한 크기로 썰어둡니다",
                        "팬에 기름을 두르고 닭가슴살을 볶습니다",
                        "닭고기가 익으면 야채를 넣고 볶습니다",
                        "간장으로 간을 맞추고 잘 섞어줍니다",
                        "소금과 후추로 마지막 간을 맞춥니다"
                    ],
                    tips: [
                        "닭가슴살은 너무 오래 볶으면 퍽퍽해집니다",
                        "야채는 아삭한 식감을 살려주세요"
                    ],
                    nutrition: {
                        calories: "약 350kcal",
                        protein: "35g",
                        carbs: "12g",
                        fat: "18g"
                    }
                },
                {
                    name: "계란볶음밥",
                    description: "간단하지만 맛있는 기본 볶음밥",
                    prepTime: "5분",
                    cookTime: "10분",
                    totalTime: "15분",
                    servings: "1인분",
                    difficulty: "easy",
                    ingredients: [
                        "밥 1공기",
                        "계란 2개",
                        "파 1대",
                        "마늘 1쪽",
                        "간장 1큰술",
                        "참기름 1작은술",
                        "식용유 2큰술",
                        "소금 약간"
                    ],
                    instructions: [
                        "계란을 풀어서 소금으로 간합니다",
                        "팬에 기름을 두르고 계란을 스크램블합니다",
                        "마늘을 넣고 볶아줍니다",
                        "밥을 넣고 계란과 섞어 볶습니다",
                        "간장과 파를 넣어 볶습니다",
                        "참기름을 넣고 마무리합니다"
                    ],
                    tips: [
                        "계란은 부드럽게 스크램블하세요",
                        "찬밥을 사용하면 더 고슬고슬합니다"
                    ]
                },
                {
                    name: "샐러드",
                    description: "신선하고 건강한 야채 샐러드",
                    prepTime: "15분",
                    cookTime: "0분",
                    totalTime: "15분",
                    servings: "2인분",
                    difficulty: "easy",
                    ingredients: [
                        "양상추 1통",
                        "토마토 2개",
                        "오이 1개",
                        "당근 1/2개",
                        "올리브오일 3큰술",
                        "식초 1큰술",
                        "소금, 후추",
                        "치즈 (선택)"
                    ],
                    instructions: [
                        "양상추는 찬물에 씻어 물기를 제거합니다",
                        "토마토는 먹기 좋은 크기로 자릅니다",
                        "오이와 당근을 슬라이스합니다",
                        "모든 야채를 그릇에 담습니다",
                        "올리브오일과 식초를 섞어 드레싱을 만듭니다",
                        "드레싱을 뿌리고 섞어서 완성합니다"
                    ],
                    tips: [
                        "야채는 차갑게 보관했다 사용하세요",
                        "드레싱은 먹기 직전에 뿌리세요"
                    ]
                }
            ]
        };
    }

    customizeRecipe(recipe, formData, userIngredients) {
        let customizedRecipe = { ...recipe };
        
        // 사용자 재료를 레시피에 반영
        const customizedIngredients = [...recipe.ingredients];
        
        // 사용자가 입력한 재료 중 레시피에 포함되지 않은 것들 추가
        userIngredients.forEach(userIngredient => {
            const isAlreadyIncluded = customizedIngredients.some(ingredient => 
                ingredient.toLowerCase().includes(userIngredient) || 
                userIngredient.includes(ingredient.toLowerCase().split(' ')[0])
            );
            
            if (!isAlreadyIncluded && userIngredient.length > 2) {
                // 기본 분량 추가
                customizedIngredients.push(`${userIngredient} 적당량`);
            }
        });

        // 요리 시간에 따른 조정
        if (formData.cookingTime) {
            const timeAdjustments = {
                'quick': { prep: '5분', cook: '10분', total: '15분' },
                'medium': { prep: '10분', cook: '20분', total: '30분' },
                'long': { prep: '15분', cook: '45분', total: '60분' },
                'extended': { prep: '30분', cook: '90분', total: '120분' }
            };
            
            if (timeAdjustments[formData.cookingTime]) {
                const adjustment = timeAdjustments[formData.cookingTime];
                customizedRecipe.prepTime = adjustment.prep;
                customizedRecipe.cookTime = adjustment.cook;
                customizedRecipe.totalTime = adjustment.total;
            }
        }

        // 식단 제한 반영
        if (formData.dietary) {
            customizedRecipe = this.applyDietaryRestrictions(customizedRecipe, formData.dietary);
        }

        // 난이도 조정
        if (formData.skillLevel) {
            customizedRecipe.difficulty = this.adjustDifficulty(customizedRecipe.difficulty, formData.skillLevel);
        }

        // 요리 유형에 맞는 이모지 추가
        if (!customizedRecipe.name.match(/[🍳🍝🍚🍜🌮🍔🥙🍛🥐]/)) {
            const cuisineEmojis = {
                korean: '🍚',
                italian: '🍝',
                asian: '🍜',
                mexican: '🌮',
                american: '🍔',
                mediterranean: '🥙',
                indian: '🍛',
                french: '🥐'
            };
            
            const emoji = cuisineEmojis[formData.cuisine] || '🍳';
            customizedRecipe.name = `${emoji} ${customizedRecipe.name}`;
        }

        return {
            ...customizedRecipe,
            ingredients: customizedIngredients
        };
    }

    applyDietaryRestrictions(recipe, dietary) {
        const restrictions = {
            'vegetarian': {
                replace: [
                    { from: '닭가슴살', to: '두부' },
                    { from: '돼지고기', to: '버섯' },
                    { from: '쇠고기', to: '콩고기' }
                ],
                avoid: ['고기', '생선', '새우']
            },
            'vegan': {
                replace: [
                    { from: '달걀', to: '아쿠아파바' },
                    { from: '우유', to: '두유' },
                    { from: '버터', to: '올리브오일' },
                    { from: '치즈', to: '영양효모' }
                ],
                avoid: ['고기', '생선', '달걀', '유제품']
            },
            'gluten-free': {
                replace: [
                    { from: '밀가루', to: '쌀가루' },
                    { from: '면', to: '쌀면' },
                    { from: '빵', to: '쌀빵' }
                ],
                avoid: ['밀가루', '글루텐']
            },
            'keto': {
                replace: [
                    { from: '쌀', to: '콜리플라워 라이스' },
                    { from: '감자', to: '무' },
                    { from: '설탕', to: '스테비아' }
                ],
                avoid: ['쌀', '면', '감자', '설탕']
            }
        };

        const restriction = restrictions[dietary];
        if (!restriction) return recipe;

        let modifiedIngredients = [...recipe.ingredients];
        
        // 재료 대체
        restriction.replace.forEach(({ from, to }) => {
            modifiedIngredients = modifiedIngredients.map(ingredient => 
                ingredient.includes(from) ? ingredient.replace(from, to) : ingredient
            );
        });

        return {
            ...recipe,
            ingredients: modifiedIngredients,
            name: `${recipe.name} (${dietary})`
        };
    }

    adjustDifficulty(currentDifficulty, skillLevel) {
        const levelMap = {
            'beginner': 'easy',
            'intermediate': 'medium',
            'advanced': 'hard'
        };
        return levelMap[skillLevel] || currentDifficulty;
    }

    displayRecipe(recipe) {
        const resultContainer = document.getElementById('recipeResult');
        
        const difficultyMap = {
            'easy': '🔰 쉬움',
            'medium': '⭐ 보통',
            'hard': '🏆 어려움'
        };

        resultContainer.innerHTML = `
            <h2>${recipe.name}</h2>
            ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}
            
            <div class="recipe-meta">
                <span>⏱️ 준비: ${recipe.prepTime}</span>
                <span>🔥 조리: ${recipe.cookTime}</span>
                <span>⏰ 총 시간: ${recipe.totalTime}</span>
                <span>🍽️ ${recipe.servings}</span>
                <span>${difficultyMap[recipe.difficulty] || '🔰 쉬움'}</span>
            </div>
            
            <div class="ingredients">
                <h3>🥕 재료</h3>
                <ul>
                    ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                </ul>
            </div>
            
            <div class="instructions">
                <h3>👨‍🍳 조리법</h3>
                <ol>
                    ${recipe.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                </ol>
            </div>
            
            ${recipe.tips && recipe.tips.length > 0 ? `
                <div class="recipe-tips">
                    <h3>💡 요리 팁</h3>
                    <ul>
                        ${recipe.tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${recipe.nutrition ? `
                <div class="nutrition-info">
                    <h3>📊 영양 정보 (1인분 기준)</h3>
                    <div class="nutrition-grid">
                        <span>칼로리: ${recipe.nutrition.calories || '정보 없음'}</span>
                        <span>단백질: ${recipe.nutrition.protein || '정보 없음'}</span>
                        <span>탄수화물: ${recipe.nutrition.carbs || '정보 없음'}</span>
                        <span>지방: ${recipe.nutrition.fat || '정보 없음'}</span>
                    </div>
                </div>
            ` : ''}
        `;
    }

    displayProducts() {
        const products = [
            {
                icon: "🥢",
                name: "프리미엄 간장",
                price: "₩12,900",
                rating: "⭐⭐⭐⭐⭐ 4.8/5"
            },
            {
                icon: "🍳",
                name: "논스틱 팬",
                price: "₩34,900",
                rating: "⭐⭐⭐⭐⭐ 4.7/5"
            },
            {
                icon: "🧄",
                name: "신선한 마늘",
                price: "₩4,900",
                rating: "⭐⭐⭐⭐ 4.5/5"
            },
            {
                icon: "🌶️",
                name: "고춧가루",
                price: "₩8,900",
                rating: "⭐⭐⭐⭐⭐ 4.9/5"
            }
        ];

        const productGrid = document.getElementById('productGrid');
        productGrid.innerHTML = products.map(product => `
            <div class="product-item">
                <div class="product-icon">${product.icon}</div>
                <h4>${product.name}</h4>
                <div class="price">${product.price}</div>
                <small>${product.rating}</small>
            </div>
        `).join('');
    }

    updateFreeLimit() {
        const remaining = Math.max(0, this.maxFreeRecipes - this.recipeCount);
        const limitEl = document.querySelector('.free-limit');
        
        if (!limitEl) return;

        if (remaining === 0) {
            limitEl.innerHTML = '<strong>🚫 무료 제한에 도달했습니다!</strong> <a href="#" data-screen="membership">레시피를 계속 만들려면 업그레이드하세요</a>';
            limitEl.style.background = 'linear-gradient(135deg, #fed7d7, #feb2b2)';
        } else {
            limitEl.innerHTML = `<strong>🎯 무료 계정:</strong> 오늘 ${remaining}개의 레시피가 남았습니다. <a href="#" data-screen="membership">무제한 레시피를 위해 업그레이드</a>`;
        }
    }

    showPaywall() {
        document.getElementById('paywall').classList.add('active');
    }

    hidePaywall() {
        document.getElementById('paywall').classList.remove('active');
    }

    showLoading() {
        document.getElementById('loadingModal').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingModal').classList.remove('active');
    }

    setupRippleEffects() {
        // 버튼 클릭 시 리플 효과
        const buttons = document.querySelectorAll('.cta-button, .nav-item, .product-item, .back-button');
        
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    pointer-events: none;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    animation: ripple 0.6s ease-out;
                `;

                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            });
        });
    }
}

// 페이지 로드 후 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new RecipeApp();
    
    // 리플 애니메이션 CSS 추가
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});